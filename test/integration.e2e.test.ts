import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { TestSetup, API_BASE_URL } from './test-setup';

describe('Integration E2E Tests', () => {
    let adminToken: string;
    let userToken: string;
    let userId: string;
    let vinylId: string;
    let reviewId: string;

    before(async () => {
        await TestSetup.initialize();
        await TestSetup.cleanup();

        const adminRes = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@integration.test',
                password: 'AdminPass123!',
                firstName: 'Admin',
                lastName: 'Adminashvili'
            }),
        });
        const adminData = await adminRes.json();
        adminToken = adminData.accessToken;

        const dataSource = TestSetup.getDataSource();
        await dataSource.query('UPDATE users SET role = ? WHERE id = ?', [
            'admin',
            adminData.user.id,
        ]);

        const userRes = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'user@integration.test',
                password: 'UserPass123!',
                firstName: 'Regular',
                lastName: 'User',
            }),
        });
        const userData = await userRes.json();
        userToken = userData.accessToken;
        userId = userData.user.id;
    });

    after(async () => {
        await TestSetup.cleanup();
        await TestSetup.destroy();
    });

    describe('Complete User Journey', () => {
        it('Admin creates a vinyl', async () => {
            const response = await fetch(`${API_BASE_URL}/vinyls`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
                },
                body: JSON.stringify({
                    name: 'Journey Test Album',
                    authorName: 'Test Band',
                    description: 'End-to-end test album',
                    price: 24.99,
                    imageUrl: 'https://example.com/album.jpg',
                }),
            });

            assert.strictEqual(response.status, 201);
            const vinyl = await response.json();
            vinylId = vinyl.id;
        });

        it('User views vinyl catalog', async () => {
            const response = await fetch(`${API_BASE_URL}/vinyls`);

            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.ok(data.data.length > 0);

            const vinyl = data.data.find((v: any) => v.id === vinylId);
            assert.ok(vinyl);
            assert.strictEqual(vinyl.averageScore, 0);
        });

        it('User views specific vinyl details', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/${vinylId}`
            );

            assert.strictEqual(response.status, 200);
            const vinyl = await response.json();
            assert.strictEqual(vinyl.name, 'Journey Test Album');
            assert.strictEqual(vinyl.averageScore, 0);
        });

        it('User creates a review', async () => {
            const response = await fetch(`${API_BASE_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({
                    vinylId,
                    comment: 'Excellent album! Highly recommended.',
                    score: 9,
                }),
            });

            assert.strictEqual(response.status, 201);
            const review = await response.json();
            reviewId = review.id;
        });

        it('Vinyl now shows updated average score', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/${vinylId}`
            );

            const vinyl = await response.json();
            assert.strictEqual(vinyl.averageScore, 9);
        });

        it('User updates their profile', async () => {
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({
                    birthDate: '1995-06-15',
                    avatar: 'https://example.com/new-avatar.jpg',
                }),
            });

            assert.strictEqual(response.status, 200);
        });

        it('User profile shows their review', async () => {
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                headers: { Authorization: `Bearer ${userToken}` },
            });

            assert.strictEqual(response.status, 200);
            const profile = await response.json();
            assert.ok(profile.reviews.length > 0);
            assert.ok(
                profile.reviews.some((r: any) => r.id === reviewId)
            );
        });

        it('Admin updates vinyl price', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/${vinylId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify({ price: 19.99 }),
                }
            );

            assert.strictEqual(response.status, 200);
            const vinyl = await response.json();
            assert.strictEqual(parseFloat(vinyl.price), 19.99);
        });

        it('User deletes their review', async () => {
            const response = await fetch(
                `${API_BASE_URL}/reviews/${reviewId}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${userToken}` },
                }
            );

            assert.strictEqual(response.status, 204);
        });

        it('Vinyl average score resets after review deletion', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/${vinylId}`
            );

            const vinyl = await response.json();
            assert.strictEqual(vinyl.averageScore, 0);
        });
    });

    describe('Multiple Reviews and Score Calculation', () => {
        let testVinylId: string;
        let user2Token: string;
        let user3Token: string;

        before(async () => {
            const vinylRes = await fetch(`${API_BASE_URL}/vinyls`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
                },
                body: JSON.stringify({
                    name: 'Multi Review Test',
                    authorName: 'Test Artist',
                    description: 'For testing multiple reviews',
                    price: 29.99,
                }),
            });
            const vinyl = await vinylRes.json();
            testVinylId = vinyl.id;

            const user2Res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'user2@integration.test',
                    password: 'Pass123!',
                    firstName: 'test2',
                    lastName: 'test2shivli'
                }),
            });
            user2Token = (await user2Res.json()).accessToken;

            const user3Res = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'user3@integration.test',
                    password: 'Pass123!',
                    firstName: 'test3',
                    lastName:'test3shvili'
                }),
            });
            user3Token = (await user3Res.json()).accessToken;
        });

        it('User 1 reviews with score 8', async () => {
            const response = await fetch(`${API_BASE_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({
                    vinylId: testVinylId,
                    comment: 'Good album',
                    score: 8,
                }),
            });

            assert.strictEqual(response.status, 201);
        });

        it('Average score should be 8', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/${testVinylId}`
            );
            const vinyl = await response.json();
            assert.strictEqual(vinyl.averageScore, 8);
        });

        it('User 2 reviews with score 6', async () => {
            const response = await fetch(`${API_BASE_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user2Token}`,
                },
                body: JSON.stringify({
                    vinylId: testVinylId,
                    comment: 'Decent',
                    score: 6,
                }),
            });

            assert.strictEqual(response.status, 201);
        });

        it('Average score should be 7 (8+6)/2', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/${testVinylId}`
            );
            const vinyl = await response.json();
            assert.strictEqual(vinyl.averageScore, 7);
        });

        it('User 3 reviews with score 10', async () => {
            const response = await fetch(`${API_BASE_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${user3Token}`,
                },
                body: JSON.stringify({
                    vinylId: testVinylId,
                    comment: 'Perfect!',
                    score: 10,
                }),
            });

            assert.strictEqual(response.status, 201);
        });

        it('Average score should be 8 (8+6+10)/3', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/${testVinylId}`
            );
            const vinyl = await response.json();
            assert.strictEqual(vinyl.averageScore, 8);
        });

        it('Filtering reviews by vinyl shows all reviews', async () => {
            const response = await fetch(
                `${API_BASE_URL}/reviews?vinylId=${testVinylId}`
            );

            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.strictEqual(data.data.length, 3);
        });
    });

    describe('Search and Filter Integration', () => {
        before(async () => {
            const vinyls = [
                {
                    name: 'Rock Album One',
                    authorName: 'Rock Band',
                    description: 'Classic rock',
                    price: 25.99,
                },
                {
                    name: 'Jazz Collection',
                    authorName: 'Jazz Ensemble',
                    description: 'Smooth jazz',
                    price: 30.99,
                },
                {
                    name: 'Rock Album Two',
                    authorName: 'Another Rock Band',
                    description: 'Hard rock',
                    price: 22.99,
                },
            ];

            for (const vinyl of vinyls) {
                await fetch(`${API_BASE_URL}/vinyls`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify(vinyl),
                });
            }
        });

        it('Search by name finds correct vinyls', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls?search=Rock`
            );

            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.ok(data.data.length >= 2);
            assert.ok(
                data.data.every(
                    (v: any) =>
                        v.name.includes('Rock') ||
                        v.authorName.includes('Rock')
                )
            );
        });

        it('Filter by author name', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls?authorName=Jazz Ensemble`
            );

            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.strictEqual(data.data.length, 1);
            assert.strictEqual(data.data[0].authorName, 'Jazz Ensemble');
        });

        it('Sort by price ascending', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls?sortBy=price&order=ASC&limit=50`
            );

            assert.strictEqual(response.status, 200);
            const data = await response.json();
            
            for (let i = 0; i < data.data.length - 1; i++) {
                const current = parseFloat(data.data[i].price);
                const next = parseFloat(data.data[i + 1].price);
                assert.ok(current <= next);
            }
        });

        it('Sort by name descending', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls?sortBy=name&order=DESC&limit=50`
            );

            assert.strictEqual(response.status, 200);
            const data = await response.json();
            
            for (let i = 0; i < data.data.length - 1; i++) {
                assert.ok(data.data[i].name >= data.data[i + 1].name);
            }
        });

        it('Pagination works correctly', async () => {
            const page1 = await fetch(
                `${API_BASE_URL}/vinyls?page=1&limit=2`
            );
            const data1 = await page1.json();

            const page2 = await fetch(
                `${API_BASE_URL}/vinyls?page=2&limit=2`
            );
            const data2 = await page2.json();

            assert.strictEqual(data1.data.length, 2);
            assert.strictEqual(data2.data.length, 2);
            assert.notStrictEqual(data1.data[0].id, data2.data[0].id);
        });
    });

    describe('Authorization and Access Control', () => {
        let sensitiveVinylId: string;
        let sensitiveReviewId: string;

        before(async () => {
    const vinylRes = await fetch(`${API_BASE_URL}/vinyls`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
            name: 'Access Control Test',
            authorName: 'Test',
            description: 'Test',
            price: 19.99,
        }),
    });

    const vinylData = await vinylRes.json();
    if (!vinylData?.id) {
        console.error('Failed to create vinyl:', vinylData);
        throw new Error('Cannot proceed without vinyl for access control tests.');
    }
    sensitiveVinylId = vinylData.id;

    const reviewRes = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
            vinylId: sensitiveVinylId,
            comment: 'User review',
            score: 7,
        }),
    });

    const reviewData = await reviewRes.json();
    if (!reviewData?.id) {
        console.error('Failed to create review:', reviewData);
        throw new Error('Cannot proceed without review for access control tests.');
    }
    sensitiveReviewId = reviewData.id;
});


        it('Admin can update any vinyl', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/${sensitiveVinylId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify({ price: 24.99 }),
                }
            );

            assert.strictEqual(response.status, 200);
        });

        it('Regular user cannot update vinyl', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/${sensitiveVinylId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${userToken}`,
                    },
                    body: JSON.stringify({ price: 29.99 }),
                }
            );

            assert.strictEqual(response.status, 403);
        });

        it('Admin can delete any vinyl', async () => {
            const createRes = await fetch(`${API_BASE_URL}/vinyls`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
                },
                body: JSON.stringify({
                    name: 'To Delete',
                    authorName: 'Test',
                    description: 'Test',
                    price: 9.99,
                }),
            });
            const toDeleteId = (await createRes.json()).id;

            const deleteRes = await fetch(
                `${API_BASE_URL}/vinyls/${toDeleteId}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${adminToken}` },
                }
            );

            assert.strictEqual(deleteRes.status, 204);
        });

        it('User can only delete their own review', async () => {
            const response = await fetch(
                `${API_BASE_URL}/reviews/${sensitiveReviewId}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${userToken}` },
                }
            );

            assert.strictEqual(response.status, 204);
        });

        it('Admin can delete any review', async () => {
            const createRes = await fetch(`${API_BASE_URL}/reviews`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({
                    vinylId: sensitiveVinylId,
                    comment: 'Another review',
                    score: 8,
                }),
            });
            const newReviewId = (await createRes.json()).id;

            const deleteRes = await fetch(
                `${API_BASE_URL}/reviews/${newReviewId}`,
                {
                    method: 'DELETE',
                    headers: { Authorization: `Bearer ${adminToken}` },
                }
            );

            assert.strictEqual(deleteRes.status, 204);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('Handles malformed JSON gracefully', async () => {
            const response = await fetch(`${API_BASE_URL}/vinyls`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
                },
                body: 'invalid json{{{',
            });

            assert.strictEqual(response.status, 400);
        });

        it('Handles very long strings appropriately', async () => {
            const longString = 'a'.repeat(10000);
            const response = await fetch(`${API_BASE_URL}/vinyls`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
                },
                body: JSON.stringify({
                    name: longString,
                    authorName: 'Test',
                    description: 'Test',
                    price: 19.99,
                }),
            });
            console.log('Response status:', response.status);


            assert.ok(
                response.status === 201 ||
                    response.status === 400 ||
                    response.status === 413
            );
        });

        it('Handles concurrent requests properly', async () => {
            const promises = Array.from({ length: 10 }, (_, i) =>
                fetch(`${API_BASE_URL}/vinyls`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify({
                        name: `Concurrent Album ${i}`,
                        authorName: 'Test',
                        description: 'Test',
                        price: 19.99,
                    }),
                })
            );

            const results = await Promise.all(promises);
            
            results.forEach((response) => {
                assert.strictEqual(response.status, 201);
            });
        });

        it('Handles special characters in search', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls?search=${encodeURIComponent("Rock & Roll's Best")}`
            );

            assert.strictEqual(response.status, 200);
        });

        it('Returns empty results for impossible filters', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls?authorName=NonExistentArtistXYZ123`
            );

            assert.strictEqual(response.status, 200);
            const data = await response.json();
            assert.strictEqual(data.data.length, 0);
            assert.strictEqual(data.total, 0);
        });
    });
});