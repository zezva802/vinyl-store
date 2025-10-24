import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../src/users/entities/user.entity';
import { JwtService } from '@nestjs/jwt';


describe('Users E2E', () => {
    jest.setTimeout(30000);

    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;

    let testUser: User;
    let otherUser: User;
    let testUserToken: string;
    let otherUserToken: string;

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
            googleId: 'test-user-google-id',
            email: 'testuser@example.com',
            firstName: 'John',
            lastName: 'Doe',
            birthDate: new Date('1990-01-15'),
            avatar: 'https://example.com/avatar.jpg',
            role: UserRole.USER,
        });
        await userRepository.save(testUser);

        otherUser = userRepository.create({
            googleId: 'other-user-google-id',
            email: 'otheruser@example.com',
            firstName: 'Jane',
            lastName: 'Smith',
            role: UserRole.USER,
        });
        await userRepository.save(otherUser);

        testUserToken = jwtService.sign({
            sub: testUser.id,
            email: testUser.email,
            role: testUser.role,
        });

        otherUserToken = jwtService.sign({
            sub: otherUser.id,
            email: otherUser.email,
            role: otherUser.role,
        });
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
    });

    describe('GET /users/profile - Get User Profile', () => {
        it('should return current user profile with relations', async () => {
            const response = await request(app.getHttpServer())
                .get('/users/profile')
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(200);

            expect(response.body.id).toBe(testUser.id);
            expect(response.body.email).toBe('testuser@example.com');
            expect(response.body.firstName).toBe('John');
            expect(response.body.lastName).toBe('Doe');
            expect(response.body.role).toBe('user');

            expect(response.body).toHaveProperty('reviews');
            expect(response.body).toHaveProperty('orders');
            expect(Array.isArray(response.body.reviews)).toBe(true);
            expect(Array.isArray(response.body.orders)).toBe(true);

            expect(response.body.birthDate).toBeDefined();

        });

        it('should return 401 without authentication', async () => {
            await request(app.getHttpServer())
                .get('/users/profile')
                .expect(401);
        });

        it('should return 401 with invalid token', async () => {
            await request(app.getHttpServer())
                .get('/users/profile')
                .set('Authorization', 'Bearer invalid-token-here')
                .expect(401);
        });
    });

    describe('PATCH /users/profile - Update User Profile', () => {
        it('should allow user to update profile fields', async () => {
            const updates = {
                firstName: 'Johnny',
                lastName: 'Updated',
                birthDate: '1995-06-20',
                avatar: 'https://example.com/new-avatar.jpg',
            };

            const response = await request(app.getHttpServer())
                .patch('/users/profile')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.firstName).toBe('Johnny');
            expect(response.body.lastName).toBe('Updated');
            expect(response.body.avatar).toBe(
                'https://example.com/new-avatar.jpg'
            );

            expect(response.body.birthDate).toBeDefined();

            expect(response.body.email).toBe('testuser@example.com');
            expect(response.body.role).toBe('user');

            const userRepository = dataSource.getRepository(User);
            const updatedUser = await userRepository.findOne({
                where: { id: testUser.id },
            });
            expect(updatedUser?.firstName).toBe('Johnny');
            expect(updatedUser?.lastName).toBe('Updated');
        });

        it('should allow partial profile update', async () => {
            const partialUpdate = {
                firstName: 'PartialUpdate',
            };

            const response = await request(app.getHttpServer())
                .patch('/users/profile')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send(partialUpdate)
                .expect(200);

            expect(response.body.firstName).toBe('PartialUpdate');
            expect(response.body.lastName).toBe('Updated');
        });

        it('should validate birthDate format', async () => {
            const invalidUpdate = {
                birthDate: 'not-a-date',
            };

            await request(app.getHttpServer())
                .patch('/users/profile')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send(invalidUpdate)
                .expect(400);
        });

        it('should accept empty update', async () => {
            const emptyUpdate = {};

            await request(app.getHttpServer())
                .patch('/users/profile')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send(emptyUpdate)
                .expect(200);
        });

        it('should reject fields not in UpdateUserDto', async () => {
            const maliciousUpdate = {
                firstName: 'Test',
                email: 'hacker@evil.com',
                role: 'admin',
                googleId: 'fake-google-id',
            };

            await request(app.getHttpServer())
                .patch('/users/profile')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send(maliciousUpdate)
                .expect(400);
        
    // Verify user data was NOT changed
            const response = await request(app.getHttpServer())
                .get('/users/profile')
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(200);
        
                expect(response.body.email).toBe('testuser@example.com');
                expect(response.body.role).toBe('user');
        });

        it('should return 401 without authentication', async () => {
            const updates = { firstName: 'Hacker' };

            await request(app.getHttpServer())
                .patch('/users/profile')
                .send(updates)
                .expect(401);
        });
    });

    describe('DELETE /users/profile - Delete User Account', () => {
        let userToDelete: User;
        let deleteToken: string;

        beforeEach(async () => {
            const userRepository = dataSource.getRepository(User);
            userToDelete = userRepository.create({
                googleId: `delete-test-${Date.now()}`,
                email: `delete-${Date.now()}@test.com`,
                firstName: 'Delete',
                lastName: 'Me',
                role: UserRole.USER,
            });
            await userRepository.save(userToDelete);

            deleteToken = jwtService.sign({
                sub: userToDelete.id,
                email: userToDelete.email,
                role: userToDelete.role,
            });
        });

        it('should allow user to delete their account', async () => {
            await request(app.getHttpServer())
                .delete('/users/profile')
                .set('Authorization', `Bearer ${deleteToken}`)
                .expect(204);

            const userRepository = dataSource.getRepository(User);
            const deletedUser = await userRepository.findOne({
                where: { id: userToDelete.id },
            });
            expect(deletedUser?.isDeleted).toBe(true);

            const activeUser = await userRepository.findOne({
                where: { id: userToDelete.id, isDeleted: false },
            });
            expect(activeUser).toBeNull();
        });

        it('should prevent deleted user from accessing profile', async () => {
            await request(app.getHttpServer())
                .delete('/users/profile')
                .set('Authorization', `Bearer ${deleteToken}`)
                .expect(204);

            await request(app.getHttpServer())
                .get('/users/profile')
                .set('Authorization', `Bearer ${deleteToken}`)
                .expect(401);
        });

        it('should return 401 without authentication', async () => {
            await request(app.getHttpServer())
                .delete('/users/profile')
                .expect(401);
        });

        it('should return 404 when trying to delete already deleted account', async () => {
            await request(app.getHttpServer())
                .delete('/users/profile')
                .set('Authorization', `Bearer ${deleteToken}`)
                .expect(204);

            await request(app.getHttpServer())
                .delete('/users/profile')
                .set('Authorization', `Bearer ${deleteToken}`)
                .expect(401);
        });
    });

    describe('User Data Isolation', () => {
        it('should only return authenticated user own profile', async () => {
            const response1 = await request(app.getHttpServer())
                .get('/users/profile')
                .set('Authorization', `Bearer ${testUserToken}`)
                .expect(200);

            expect(response1.body.id).toBe(testUser.id);
            expect(response1.body.email).toBe('testuser@example.com');
            const response2 = await request(app.getHttpServer())
                .get('/users/profile')
                .set('Authorization', `Bearer ${otherUserToken}`)
                .expect(200);

            expect(response2.body.id).toBe(otherUser.id);
            expect(response2.body.email).toBe('otheruser@example.com');

            expect(response1.body.id).not.toBe(response2.body.id);
        });

        it('should only update authenticated user own profile', async () => {
            const updates = { firstName: 'Hacked' };

            const response = await request(app.getHttpServer())
                .patch('/users/profile')
                .set('Authorization', `Bearer ${testUserToken}`)
                .send(updates)
                .expect(200);

            expect(response.body.id).toBe(testUser.id);
            expect(response.body.firstName).toBe('Hacked');

            const userRepository = dataSource.getRepository(User);
            const otherUserCheck = await userRepository.findOne({
                where: { id: otherUser.id },
            });
            expect(otherUserCheck?.firstName).toBe('Jane');
        });
    });
});