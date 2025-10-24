import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../src/users/entities/user.entity';
import { Vinyl } from '../src/vinyls/entities/vinyl.entity';
import { JwtService } from '@nestjs/jwt';

describe('Vinyls E2E', () => {
    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;

    let adminUser: User;
    let regularUser: User;
    let adminToken: string;
    let userToken: string;

    let testVinyl: Vinyl;

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

        adminUser = userRepository.create({
            googleId: 'test-admin-google-id',
            email: 'admin@test.com',
            firstName: 'Admin',
            lastName: 'User',
            role: UserRole.ADMIN,
        });
        await userRepository.save(adminUser);

        regularUser = userRepository.create({
            googleId: 'test-user-google-id',
            email: 'user@test.com',
            firstName: 'Regular',
            lastName: 'User',
            role: UserRole.USER,
        });
        await userRepository.save(regularUser);

        adminToken = jwtService.sign({
            sub: adminUser.id,
            email: adminUser.email,
            role: adminUser.role,
        });

        userToken = jwtService.sign({
            sub: regularUser.id,
            email: regularUser.email,
            role: regularUser.role,
        });

        const vinylRepository = dataSource.getRepository(Vinyl);
        testVinyl = vinylRepository.create({
            name: 'Test Album',
            authorName: 'Test Artist',
            description: 'A test album for E2E testing',
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

    describe('GET /vinyls - Public Access', () => {
        it('should return vinyls without authentication', async () => {
            const response = await request(app.getHttpServer())
                .get('/vinyls')
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('page');
            expect(response.body).toHaveProperty('limit');
            expect(response.body).toHaveProperty('totalPages');

            expect(response.body.data).toHaveLength(1);
            expect(response.body.data[0].name).toBe('Test Album');
            expect(response.body.data[0].authorName).toBe('Test Artist');
            expect(response.body.data[0].price).toBe('29.99');
        });

        it('should paginate results correctly', async () => {
            const vinylRepository = dataSource.getRepository(Vinyl);

            for (let i = 1; i <= 25; i++) {
                const vinyl = vinylRepository.create({
                    name: `Album ${i}`,
                    authorName: `Artist ${i}`,
                    description: `Description ${i}`,
                    price: 10 + i,
                    imageUrl: `https://example.com/${i}.jpg`,
                });
                await vinylRepository.save(vinyl);
            }

            const page1 = await request(app.getHttpServer())
                .get('/vinyls?page=1&limit=10')
                .expect(200);

            expect(page1.body.data).toHaveLength(10);
            expect(page1.body.page).toBe(1);
            expect(page1.body.limit).toBe(10);
            expect(page1.body.total).toBe(26);
            expect(page1.body.totalPages).toBe(3);

            const page2 = await request(app.getHttpServer())
                .get('/vinyls?page=2&limit=10')
                .expect(200);

            expect(page2.body.data).toHaveLength(10);
            expect(page2.body.page).toBe(2);

            expect(page1.body.data[0].id).not.toBe(page2.body.data[0].id);
        });

        it('should search by vinyl name', async () => {
            const response = await request(app.getHttpServer())
                .get('/vinyls?search=Test Album')
                .expect(200);

            expect(response.body.data.length).toBeGreaterThan(0);
            const found = response.body.data.some(
                (v: Vinyl) => v.name === 'Test Album'
            );
            expect(found).toBe(true);
        });

        it('should search by author name', async () => {
            const response = await request(app.getHttpServer())
                .get('/vinyls?search=Test Artist')
                .expect(200);

            expect(response.body.data.length).toBeGreaterThan(0);
            const found = response.body.data.some(
                (v: Vinyl) => v.authorName === 'Test Artist'
            );
            expect(found).toBe(true);
        });

        it('should sort by price ascending', async () => {
            const response = await request(app.getHttpServer())
                .get('/vinyls?sortBy=price&order=ASC')
                .expect(200);

            const prices = response.body.data.map((v: Vinyl) =>
                parseFloat(v.price as unknown as string)
            );

            for (let i = 0; i < prices.length - 1; i++) {
                expect(prices[i]).toBeLessThanOrEqual(prices[i + 1]);
            }
        });

        it('should sort by name descending', async () => {
            const response = await request(app.getHttpServer())
                .get('/vinyls?sortBy=name&order=DESC')
                .expect(200);

            const names = response.body.data.map((v: Vinyl) => v.name);

            for (let i = 0; i < names.length - 1; i++) {
                expect(
                    names[i].localeCompare(names[i + 1])
                ).toBeGreaterThanOrEqual(0);
            }
        });
    });

    describe('GET /vinyls/:id - Get Single Vinyl', () => {
        it('should return a single vinyl by id', async () => {
            const response = await request(app.getHttpServer())
                .get(`/vinyls/${testVinyl.id}`)
                .expect(200);

            expect(response.body.id).toBe(testVinyl.id);
            expect(response.body.name).toBe('Test Album');
            expect(response.body).toHaveProperty('averageScore');
        });

        it('should return 404 for non-existent vinyl', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';

            const response = await request(app.getHttpServer())
                .get(`/vinyls/${fakeId}`)
                .expect(404);

            expect(response.body.message).toBe('Vinyl not found');
        });
    });

    describe('POST /vinyls - Create Vinyl (Admin Only)', () => {
        it('should allow admin to create vinyl', async () => {
            const newVinyl = {
                name: 'New Album',
                authorName: 'New Artist',
                description: 'A brand new album',
                price: 35.99,
                imageUrl: 'https://example.com/new.jpg',
            };

            const response = await request(app.getHttpServer())
                .post('/vinyls')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(newVinyl)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.name).toBe('New Album');
            expect(response.body.authorName).toBe('New Artist');
            expect(response.body.price).toBe(35.99);

            const vinylRepository = dataSource.getRepository(Vinyl);
            const savedVinyl = await vinylRepository.findOne({
                where: { id: response.body.id },
            });
            expect(savedVinyl).toBeDefined();
            expect(savedVinyl?.name).toBe('New Album');
        });

        it('should return 403 when regular user tries to create vinyl', async () => {
            const newVinyl = {
                name: 'Forbidden Album',
                authorName: 'Forbidden Artist',
                description: 'Should not be created',
                price: 25.99,
            };

            const response = await request(app.getHttpServer())
                .post('/vinyls')
                .set('Authorization', `Bearer ${userToken}`)
                .send(newVinyl)
                .expect(403); // ← 403 Forbidden

            expect(response.body.message).toContain('permission');
        });

        it('should return 400 for invalid vinyl data', async () => {
            const invalidVinyl = {
                name: '',
                description: 'Test',
                price: -5,
            };

            await request(app.getHttpServer())
                .post('/vinyls')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(invalidVinyl)
                .expect(400);
        });

        it('should return 401 without authentication', async () => {
            const newVinyl = {
                name: 'Unauthorized Album',
                authorName: 'Unauthorized Artist',
                description: 'Should not be created',
                price: 25.99,
            };

            await request(app.getHttpServer())
                .post('/vinyls')
                .send(newVinyl)
                .expect(401);
        });
    });

    describe('PATCH /vinyls/:id - Update Vinyl (Admin Only)', () => {
        it('should allow admin to update vinyl', async () => {
            const updates = {
                name: 'Updated Album Name',
                price: 39.99,
            };

            const response = await request(app.getHttpServer())
                .patch(`/vinyls/${testVinyl.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.name).toBe('Updated Album Name');
            expect(response.body.price).toBe('39.99');
            expect(response.body.authorName).toBe('Test Artist');
        });

        it('should return 403 when regular user tries to update', async () => {
            const updates = { name: 'Hacked Name' };

            await request(app.getHttpServer())
                .patch(`/vinyls/${testVinyl.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .send(updates)
                .expect(403);
        });

        it('should return 404 for non-existent vinyl', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';
            const updates = { name: 'New Name' };

            const response = await request(app.getHttpServer())
                .patch(`/vinyls/${fakeId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .send(updates)
                .expect(404);

            expect(response.body.message).toBe('Vinyl not found');
        });
    });

    describe('DELETE /vinyls/:id - Delete Vinyl (Admin Only)', () => {
        let vinylToDelete: Vinyl;

        beforeEach(async () => {
            const vinylRepository = dataSource.getRepository(Vinyl);
            vinylToDelete = vinylRepository.create({
                name: 'Delete Me',
                authorName: 'Delete Artist',
                description: 'Will be deleted',
                price: 19.99,
            });
            await vinylRepository.save(vinylToDelete);
        });

        it('should allow admin to delete vinyl', async () => {
            await request(app.getHttpServer())
                .delete(`/vinyls/${vinylToDelete.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(204);

            const vinylRepository = dataSource.getRepository(Vinyl);
            const deletedVinyl = await vinylRepository.findOne({
                where: { id: vinylToDelete.id },
            });
            expect(deletedVinyl?.isDeleted).toBe(true);

            const response = await request(app.getHttpServer())
                .get('/vinyls')
                .expect(200);

            const found = response.body.data.some(
                (v: Vinyl) => v.id === vinylToDelete.id
            );
            expect(found).toBe(false);
        });

        it('should return 403 when regular user tries to delete', async () => {
            await request(app.getHttpServer())
                .delete(`/vinyls/${vinylToDelete.id}`)
                .set('Authorization', `Bearer ${userToken}`)
                .expect(403);

            const vinylRepository = dataSource.getRepository(Vinyl);
            const vinyl = await vinylRepository.findOne({
                where: { id: vinylToDelete.id },
            });
            expect(vinyl?.isDeleted).toBe(false);
        });

        it('should return 404 for non-existent vinyl', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';

            const response = await request(app.getHttpServer())
                .delete(`/vinyls/${fakeId}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(404);

            expect(response.body.message).toBe('Vinyl not found');
        });
    });
});
