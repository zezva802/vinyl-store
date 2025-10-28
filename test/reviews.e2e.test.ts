import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { TestSetup, API_BASE_URL } from './test-setup';

describe('Reviews E2E Tests', () => {
    let user1Token: string;
    let user2Token: string;
    let adminToken: string;
    let vinylId: string;
    let reviewId: string;
    let user1Id: string;

    before(async () => {
        await TestSetup.initialize();
        await TestSetup.cleanup();

        const user1Res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'user1@review.test',
                password: 'Pass123!',
                firstName: 'User',
                lastName: 'One',
            }),
        });
        const user1Data = await user1Res.json();
        user1Token = user1Data.accessToken;
        user1Id = user1Data.user.id;

        const user2Res = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'user2@review.test',
                password: 'Pass123!',
                firstName: 'User',
                lastName: 'Two',
            }),
        });
        const user2Data = await user2Res.json();
        user2Token = user2Data.accessToken;

        const adminRes = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@review.test',
                password: 'AdminPass123!',
                firstName: 'Admin',
                lastName: 'Adminadze',
            }),
        });
        const adminData = await adminRes.json();
        adminToken = adminData.accessToken;

        const dataSource = TestSetup.getDataSource();
        await dataSource.query('UPDATE users SET role = ? WHERE id = ?', [
            'admin',
            adminData.user.id,
        ]);

        const vinylRes = await fetch(`${API_BASE_URL}/vinyls`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${adminToken}`,
            },
            body: JSON.stringify({
                name: 'Test Album',
                authorName: 'Test Artist',
                description: 'For review testing',
                price: 19.99,
            }),
        });
        const vinyl = await vinylRes.json();
        vinylId = vinyl.id;
    });

    after(async () => {
        await TestSetup.cleanup();
        await TestSetup.destroy();
    });

    describe('POST /reviews', () => {
        it('should create a review', async () => {
            const response = await fetch(`${API_BASE_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user1Token}`,
                },
                body: JSON.stringify({
                    vinylId,
                    comment: 'Great album! Love the sound quality.',
                    score: 9,
                }),
            });

            assert.strictEqual(response.status, 201);

            const review = await response.json();
            assert.strictEqual(
                review.comment,
                'Great album! Love the sound quality.'
            );
            assert.strictEqual(review.score, 9);
            assert.strictEqual(review.userId, user1Id);

            reviewId = review.id;
        });

        it('should reject review without auth', async () => {
            const response = await fetch(`${API_BASE_URL}/reviews`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    vinylId,
                    comment: 'Test comment',
                    score: 8,
                }),
            });

            assert.strictEqual(response.status, 401);
        });

        it('should reject duplicate review from same user', async () => {
            const response = await fetch(`${API_BASE_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user1Token}`,
                },
                body: JSON.stringify({
                    vinylId,
                    comment: 'Another review',
                    score: 7,
                }),
            });

            assert.strictEqual(response.status, 400);
            const data = await response.json();
            assert.ok(data.message.includes('already reviewed'));
        });

        it('should reject review with invalid score', async () => {
            const response = await fetch(`${API_BASE_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user2Token}`,
                },
                body: JSON.stringify({
                    vinylId,
                    comment: 'Test',
                    score: 11,
                }),
            });

            assert.strictEqual(response.status, 400);
        });

        it('should reject review for non-existent vinyl', async () => {
            const response = await fetch(`${API_BASE_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user2Token}`,
                },
                body: JSON.stringify({
                    vinylId: '00000000-0000-0000-0000-000000000000',
                    comment: 'Test',
                    score: 8,
                }),
            });

            assert.strictEqual(response.status, 404);
        });

        it('should allow different user to review same vinyl', async () => {
            const response = await fetch(`${API_BASE_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user2Token}`,
                },
                body: JSON.stringify({
                    vinylId,
                    comment: 'Different opinion here',
                    score: 6,
                }),
            });

            assert.strictEqual(response.status, 201);
        });
    });

    describe('GET /reviews', () => {
        it('should get all reviews', async () => {
            const response = await fetch(`${API_BASE_URL}/reviews`);

            assert.strictEqual(response.status, 200);

            const data = await response.json();
            assert.ok(Array.isArray(data.data));
            assert.ok(data.data.length >= 2);
            assert.ok(data.data[0].user);
        });

        it('should filter reviews by vinylId', async () => {
            const response = await fetch(
                `${API_BASE_URL}/reviews?vinylId=${vinylId}`
            );

            assert.strictEqual(response.status, 200);

            const data = await response.json();
            assert.ok(data.data.every((r: any) => r.vinylId === vinylId));
        });

        it('should paginate reviews', async () => {
            const response = await fetch(
                `${API_BASE_URL}/reviews?page=1&limit=1`
            );

            assert.strictEqual(response.status, 200);

            const data = await response.json();
            assert.strictEqual(data.data.length, 1);
            assert.strictEqual(data.limit, 1);
        });
    });

    describe('GET /reviews/:id', () => {
        it('should get review by id', async () => {
            const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`);

            assert.strictEqual(response.status, 200);

            const review = await response.json();
            assert.strictEqual(review.id, reviewId);
            assert.ok(review.user);
            assert.ok(review.vinyl);
        });

        it('should return 404 for non-existent review', async () => {
            const response = await fetch(
                `${API_BASE_URL}/reviews/00000000-0000-0000-0000-000000000000`
            );

            assert.strictEqual(response.status, 404);
        });
    });

    describe('DELETE /reviews/:id', () => {
        it('should reject deletion by different user', async () => {
            const response = await fetch(
                `${API_BASE_URL}/reviews/${reviewId}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${user2Token}`,
                    },
                }
            );

            assert.strictEqual(response.status, 403);
        });

        it('should allow user to delete own review', async () => {
            const response = await fetch(
                `${API_BASE_URL}/reviews/${reviewId}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${user1Token}`,
                    },
                }
            );

            assert.strictEqual(response.status, 204);
        });

        it('should return 404 for deleted review', async () => {
            const response = await fetch(`${API_BASE_URL}/reviews/${reviewId}`);

            assert.strictEqual(response.status, 404);
        });

        it('should allow admin to delete any review', async () => {
            const createRes = await fetch(`${API_BASE_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user1Token}`,
                },
                body: JSON.stringify({
                    vinylId,
                    comment: 'To be deleted by admin',
                    score: 5,
                }),
            });
            const newReview = await createRes.json();

            const deleteRes = await fetch(
                `${API_BASE_URL}/reviews/${newReview.id}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${adminToken}`,
                    },
                }
            );

            assert.strictEqual(deleteRes.status, 204);
        });
    });
});
