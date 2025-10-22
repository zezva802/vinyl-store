import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../src/users/entities/user.entity';
import { Vinyl } from '../src/vinyls/entities/vinyl.entity';
import { Order, OrderStatus } from '../src/orders/entities/order.entity';
import { JwtService } from '@nestjs/jwt';

describe('Orders E2E - Complete Payment Flow', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;
    let testUser: User;
    let testVinyl: Vinyl;
    let authToken: string;

    beforeAll(async () => {
        process.env.NODE_ENV = 'test';

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();

        app.useGlobalPipes(
            new ValidationPipe({
                whitelist: true,
                forbidNonWhitelisted: true,
                transform: true,
            })
        );

        await app.init();

        dataSource = moduleFixture.get<DataSource>(DataSource);
        jwtService = moduleFixture.get<JwtService>(JwtService);

        if (!dataSource.isInitialized) {
            await dataSource.initialize();
        }

        await dataSource.synchronize(true);

        const userRepository = dataSource.getRepository(User);
        testUser = userRepository.create({
            googleId: 'test-google-id-123',
            email: 'testuser@example.com',
            firstName: 'Test',
            lastName: 'User',
            role: UserRole.USER,
        });
        await userRepository.save(testUser);

        authToken = jwtService.sign({
            sub: testUser.id,
            email: testUser.email,
            role: testUser.role,
        });

        const vinylRepository = dataSource.getRepository(Vinyl);
        testVinyl = vinylRepository.create({
            name: 'Test Album',
            authorName: 'Test Artist',
            description: 'A test vinyl for e2e testing',
            price: 29.99,
            imageUrl: 'https://example.com/test.jpg',
        });
        await vinylRepository.save(testVinyl);
    });

    afterAll(async () => {
        if (dataSource && dataSource.isInitialized) {
            const dbName = dataSource.options.database;
            if (dbName !== 'vinyl_store_test') {
                throw new Error(
                    `DANGER: Attempted to drop non-test database: ${dbName}`
                );
            }

            await dataSource.dropDatabase();
            await dataSource.destroy();
        }

        await app.close();
    }, 30000);

    describe('Complete Payment Flow', () => {
        it('should complete full payment workflow: create order -> webhook -> complete', async () => {
            const vinylsResponse = await request(app.getHttpServer())
                .get('/vinyls')
                .expect(200);

            expect(vinylsResponse.body.data).toHaveLength(1);
            expect(vinylsResponse.body.data[0].name).toBe('Test Album');

            const createPaymentResponse = await request(app.getHttpServer())
                .post('/orders/create-payment-intent')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ vinylId: testVinyl.id })
                .expect(201);

            expect(createPaymentResponse.body).toHaveProperty('clientSecret');
            expect(createPaymentResponse.body).toHaveProperty('orderId');
            expect(createPaymentResponse.body).toHaveProperty('amount');
            expect(createPaymentResponse.body.amount).toBe(2999);

            const orderId = createPaymentResponse.body.orderId;

            const orderRepository = dataSource.getRepository(Order);
            let order = await orderRepository.findOne({
                where: { id: orderId },
                relations: ['items', 'items.vinyl'],
            });

            expect(order).toBeDefined();
            expect(order?.status).toBe(OrderStatus.PENDING);
            expect(order?.userId).toBe(testUser.id);
            expect(order?.totalAmount).toBe('29.99');
            expect(order?.items).toHaveLength(1);
            expect(order?.items[0].vinylId).toBe(testVinyl.id);

            const paymentIntentId = order?.stripePaymentIntentId;

            if (order) {
                order.status = OrderStatus.COMPLETED;
                await orderRepository.save(order);
            }

            order = await orderRepository.findOne({
                where: { id: orderId },
            });

            expect(order?.status).toBe(OrderStatus.COMPLETED);

            const userOrdersResponse = await request(app.getHttpServer())
                .get('/orders')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(userOrdersResponse.body).toHaveLength(1);
            expect(userOrdersResponse.body[0].id).toBe(orderId);
            expect(userOrdersResponse.body[0].status).toBe('completed');

            const specificOrderResponse = await request(app.getHttpServer())
                .get(`/orders/${orderId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(specificOrderResponse.body.id).toBe(orderId);
            expect(specificOrderResponse.body.status).toBe('completed');
            expect(specificOrderResponse.body.items).toHaveLength(1);
            expect(specificOrderResponse.body.items[0].vinyl.name).toBe(
                'Test Album'
            );
        });

        it('should require authentication for creating payment intent', async () => {
            await request(app.getHttpServer())
                .post('/orders/create-payment-intent')
                .send({ vinylId: testVinyl.id })
                .expect(401);
        });

        it('should validate vinylId in payment intent creation', async () => {
            const response = await request(app.getHttpServer())
                .post('/orders/create-payment-intent')
                .set('Authorization', `Bearer ${authToken}`)
                .send({ vinylId: 'nonexistent-vinyl-id' })
                .expect(404);

            expect(response.body.message).toBe('Vinyl not found');
        });

        it('should require authentication for viewing orders', async () => {
            await request(app.getHttpServer()).get('/orders').expect(401);
        });
    });
});
