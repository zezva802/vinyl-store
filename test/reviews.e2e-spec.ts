import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { User, UserRole } from '../src/users/entities/user.entity';
import { Vinyl } from '../src/vinyls/entities/vinyl.entity';
import { Review } from '../src/reviews/entities/review.entity';
import { JwtService } from '@nestjs/jwt';

describe('Reviews E2E', () => {
    jest.setTimeout(30000);

    let app: INestApplication;
    let dataSource: DataSource;
    let jwtService: JwtService;

    let user1: User;
    let user2: User;
    let adminUser: User;
    let user1Token: string;
    let user2Token: string;
    let adminToken: string;

    let testVinyl1: Vinyl;
    let testVinyl2: Vinyl;
    let user1Review: Review;

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

        user1 = userRepository.create({
            googleId: 'user1-google-id',
            email: 'user1@test.com',
            firstName: 'User',
            lastName: 'One',
            role: UserRole.USER,
        });
        await userRepository.save(user1);

        user2 = userRepository.create({
            googleId: 'user2-google-id',
            email: 'user2@test.com',
            firstName: 'User',
            lastName: 'Two',
            role: UserRole.USER,
        });
        await userRepository.save(user2);

        adminUser = userRepository.create({
            googleId: 'admin-google-id',
            email: 'admin@test.com',
            firstName: 'Admin',
            lastName: 'User',
            role: UserRole.ADMIN,
        });
        await userRepository.save(adminUser);

        user1Token = jwtService.sign({
            sub: user1.id,
            email: user1.email,
            role: user1.role,
        });

        user2Token = jwtService.sign({
            sub: user2.id,
            email: user2.email,
            role: user2.role,
        });

        adminToken = jwtService.sign({
            sub: adminUser.id,
            email: adminUser.email,
            role: adminUser.role,
        });

        const vinylRepository = dataSource.getRepository(Vinyl);

        testVinyl1 = vinylRepository.create({
            name: 'Dark Side of the Moon',
            authorName: 'Pink Floyd',
            description: 'Classic progressive rock album',
            price: 29.99,
            imageUrl: 'https://example.com/dsotm.jpg',
        });
        await vinylRepository.save(testVinyl1);

        testVinyl2 = vinylRepository.create({
            name: 'Abbey Road',
            authorName: 'The Beatles',
            description: 'Iconic Beatles album',
            price: 31.99,
            imageUrl: 'https://example.com/abbey.jpg',
        });
        await vinylRepository.save(testVinyl2);

        const reviewRepository = dataSource.getRepository(Review);
        user1Review = reviewRepository.create({
            userId: user1.id,
            vinylId: testVinyl1.id,
            comment: 'Amazing album! A masterpiece.',
            score: 10,
        });
        await reviewRepository.save(user1Review);
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

    describe('POST /reviews - Create Review', () => {
        it('should allow authenticated user to create a review', async () => {
            const newReview = {
                vinylId: testVinyl2.id,
                comment: 'Great album! Highly recommend.',
                score: 9,
            };

            const response = await request(app.getHttpServer())
                .post('/reviews')
                .set('Authorization', `Bearer ${user1Token}`)
                .send(newReview)
                .expect(201);

            expect(response.body).toHaveProperty('id');
            expect(response.body.vinylId).toBe(testVinyl2.id);
            expect(response.body.userId).toBe(user1.id);
            expect(response.body.comment).toBe('Great album! Highly recommend.');
            expect(response.body.score).toBe(9);
            expect(response.body.isDeleted).toBe(false);

            const reviewRepository = dataSource.getRepository(Review);
            const savedReview = await reviewRepository.findOne({
                where: { id: response.body.id },
            });
            expect(savedReview).toBeDefined();
            expect(savedReview?.userId).toBe(user1.id);
        });

        it('should prevent user from reviewing same vinyl twice', async () => {
            const duplicateReview = {
                vinylId: testVinyl1.id,
                comment: 'Trying to review again',
                score: 8,
            };

            const response = await request(app.getHttpServer())
                .post('/reviews')
                .set('Authorization', `Bearer ${user1Token}`)
                .send(duplicateReview)
                .expect(400);

            expect(response.body.message).toContain('already reviewed');
        });

        it('should allow different user to review same vinyl', async () => {
            const user2Review = {
                vinylId: testVinyl1.id,
                comment: 'I also love this album!',
                score: 9,
            };

            const response = await request(app.getHttpServer())
                .post('/reviews')
                .set('Authorization', `Bearer ${user2Token}`)
                .send(user2Review)
                .expect(201);

            expect(response.body.userId).toBe(user2.id);
            expect(response.body.vinylId).toBe(testVinyl1.id);
        });

        it('should reject score below 1', async () => {
            const invalidReview = {
                vinylId: testVinyl2.id,
                comment: 'Bad score',
                score: 0,
            };

            await request(app.getHttpServer())
                .post('/reviews')
                .set('Authorization', `Bearer ${user2Token}`)
                .send(invalidReview)
                .expect(400);
        });

        it('should reject score above 10', async () => {
            const invalidReview = {
                vinylId: testVinyl2.id,
                comment: 'Bad score',
                score: 11,
            };

            await request(app.getHttpServer())
                .post('/reviews')
                .set('Authorization', `Bearer ${user2Token}`)
                .send(invalidReview)
                .expect(400);
        });

        it('should accept score at boundaries (1 and 10)', async () => {
            const minReview = {
                vinylId: testVinyl2.id,
                comment: 'Minimum score',
                score: 1,
            };

            const response1 = await request(app.getHttpServer())
                .post('/reviews')
                .set('Authorization', `Bearer ${adminToken}`)
                .send(minReview)
                .expect(201);

            expect(response1.body.score).toBe(1);

            const vinylRepository = dataSource.getRepository(Vinyl);
            const tempVinyl = vinylRepository.create({
                name: 'Test Vinyl for Max Score',
                authorName: 'Test Artist',
                description: 'Test',
                price: 20,
            });
            await vinylRepository.save(tempVinyl);

            const maxReview = {
                vinylId: tempVinyl.id,
                comment: 'Maximum score',
                score: 10,
            };

            const response2 = await request(app.getHttpServer())
                .post('/reviews')
                .set('Authorization', `Bearer ${user2Token}`)
                .send(maxReview)
                .expect(201);

            expect(response2.body.score).toBe(10);
        });

        it('should reject review with missing fields', async () => {
            const incompleteReview = {
                vinylId: testVinyl2.id,
            };

            await request(app.getHttpServer())
                .post('/reviews')
                .set('Authorization', `Bearer ${user2Token}`)
                .send(incompleteReview)
                .expect(400);
        });

        it('should return 404 for non-existent vinyl', async () => {
            const reviewForFakeVinyl = {
                vinylId: '00000000-0000-0000-0000-000000000000',
                comment: 'Review for fake vinyl',
                score: 8,
            };

            const response = await request(app.getHttpServer())
                .post('/reviews')
                .set('Authorization', `Bearer ${user1Token}`)
                .send(reviewForFakeVinyl)
                .expect(404);

            expect(response.body.message).toContain('not found');
        });

        it('should return 401 without authentication', async () => {
            const review = {
                vinylId: testVinyl2.id,
                comment: 'Unauthorized review',
                score: 7,
            };

            await request(app.getHttpServer())
                .post('/reviews')
                .send(review)
                .expect(401);
        });
    });

    describe('GET /reviews - List Reviews', () => {
        it('should return reviews without authentication', async () => {
            const response = await request(app.getHttpServer())
                .get('/reviews')
                .expect(200);

            expect(response.body).toHaveProperty('data');
            expect(response.body).toHaveProperty('total');
            expect(response.body).toHaveProperty('page');
            expect(response.body).toHaveProperty('limit');
            expect(Array.isArray(response.body.data)).toBe(true);
        });

        it('should paginate reviews correctly', async () => {
            const response = await request(app.getHttpServer())
                .get('/reviews?page=1&limit=2')
                .expect(200);

            expect(response.body.page).toBe(1);
            expect(response.body.limit).toBe(2);
            expect(response.body.data.length).toBeLessThanOrEqual(2);
        });

        it('should filter reviews by vinylId', async () => {
            const response = await request(app.getHttpServer())
                .get(`/reviews?vinylId=${testVinyl1.id}`)
                .expect(200);

            response.body.data.forEach((review: Review) => {
                expect(review.vinylId).toBe(testVinyl1.id);
            });
        });

        it('should include user information in reviews', async () => {
            const response = await request(app.getHttpServer())
                .get('/reviews')
                .expect(200);

            expect(response.body.data.length).toBeGreaterThan(0);
            const firstReview = response.body.data[0];
            expect(firstReview).toHaveProperty('user');
            expect(firstReview.user).toHaveProperty('firstName');
            expect(firstReview.user).toHaveProperty('lastName');
        });
    });

    describe('GET /reviews/:id - Get Single Review', () => {
        it('should return a single review by id', async () => {
            const response = await request(app.getHttpServer())
                .get(`/reviews/${user1Review.id}`)
                .expect(200);

            expect(response.body.id).toBe(user1Review.id);
            expect(response.body.comment).toBe('Amazing album! A masterpiece.');
            expect(response.body).toHaveProperty('user');
            expect(response.body).toHaveProperty('vinyl');
        });

        it('should return 404 for non-existent review', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';

            const response = await request(app.getHttpServer())
                .get(`/reviews/${fakeId}`)
                .expect(404);

            expect(response.body.message).toContain('not found');
        });
    });

    describe('DELETE /reviews/:id - Delete Review', () => {
        let user1OwnReview: Review;
        let user2OwnReview: Review;

        beforeEach(async () => {
            const reviewRepository = dataSource.getRepository(Review);
            const vinylRepository = dataSource.getRepository(Vinyl);

            const tempVinyl1 = vinylRepository.create({
                name: 'Temp Album 1',
                authorName: 'Temp Artist 1',
                description: 'For delete test',
                price: 25,
            });
            await vinylRepository.save(tempVinyl1);

            const tempVinyl2 = vinylRepository.create({
                name: 'Temp Album 2',
                authorName: 'Temp Artist 2',
                description: 'For delete test',
                price: 25,
            });
            await vinylRepository.save(tempVinyl2);

            user1OwnReview = reviewRepository.create({
                userId: user1.id,
                vinylId: tempVinyl1.id,
                comment: 'User1 review to delete',
                score: 8,
            });
            await reviewRepository.save(user1OwnReview);

            user2OwnReview = reviewRepository.create({
                userId: user2.id,
                vinylId: tempVinyl2.id,
                comment: 'User2 review',
                score: 7,
            });
            await reviewRepository.save(user2OwnReview);
        });

        it('should allow user to delete their own review', async () => {
            await request(app.getHttpServer())
                .delete(`/reviews/${user1OwnReview.id}`)
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(204);

            const reviewRepository = dataSource.getRepository(Review);
            const deletedReview = await reviewRepository.findOne({
                where: { id: user1OwnReview.id },
            });
            expect(deletedReview?.isDeleted).toBe(true);

            const response = await request(app.getHttpServer())
                .get('/reviews')
                .expect(200);

            const found = response.body.data.some(
                (r: Review) => r.id === user1OwnReview.id
            );
            expect(found).toBe(false);
        });

        it('should return 403 when user tries to delete another user review', async () => {
            const response = await request(app.getHttpServer())
                .delete(`/reviews/${user2OwnReview.id}`)
                .set('Authorization', `Bearer ${user1Token}`) // ← user1 trying to delete user2's review
                .expect(403);

            expect(response.body.message).toContain('own reviews');

            const reviewRepository = dataSource.getRepository(Review);
            const review = await reviewRepository.findOne({
                where: { id: user2OwnReview.id },
            });
            expect(review?.isDeleted).toBe(false);
        });

        it('should allow admin to delete any review', async () => {
            await request(app.getHttpServer())
                .delete(`/reviews/${user1OwnReview.id}`)
                .set('Authorization', `Bearer ${adminToken}`)
                .expect(204);

            const reviewRepository = dataSource.getRepository(Review);
            const deletedReview = await reviewRepository.findOne({
                where: { id: user1OwnReview.id },
            });
            expect(deletedReview?.isDeleted).toBe(true);
        });

        it('should return 404 for non-existent review', async () => {
            const fakeId = '00000000-0000-0000-0000-000000000000';

            const response = await request(app.getHttpServer())
                .delete(`/reviews/${fakeId}`)
                .set('Authorization', `Bearer ${user1Token}`)
                .expect(404);

            expect(response.body.message).toContain('not found');
        });

        it('should return 401 without authentication', async () => {
            await request(app.getHttpServer())
                .delete(`/reviews/${user1OwnReview.id}`)
                .expect(401);
        });
    });
});