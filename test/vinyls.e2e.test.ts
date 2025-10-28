import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { TestSetup, API_BASE_URL } from './test-setup';

describe('Vinyls E2E Tests', () => {
    let adminToken: string;
    let userToken: string;
    let createdVinylId: string;

    before(async () => {
        await TestSetup.initialize();
        await TestSetup.cleanup();

        const adminRes = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@vinyl.test',
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

        const userRes = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'user@vinyl.test',
                password: 'UserPass123!',
                firstName: 'User',
            }),
        });
        const userData = await userRes.json();
        userToken = userData.accessToken;
    });

    after(async () => {
        await TestSetup.cleanup();
        await TestSetup.destroy();
    });

    describe('POST /vinyls', () => {
        it('should create vinyl as admin', async () => {
            const response = await fetch(`${API_BASE_URL}/vinyls`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
                },
                body: JSON.stringify({
                    name: 'Dark Side of the Moon',
                    authorName: 'Pink Floyd',
                    description: 'Progressive rock masterpiece',
                    price: 29.99,
                    imageUrl: 'https://example.com/image.jpg',
                }),
            });

            assert.strictEqual(response.status, 201);

            const vinyl = await response.json();
            assert.strictEqual(vinyl.name, 'Dark Side of the Moon');
            assert.strictEqual(vinyl.authorName, 'Pink Floyd');
            assert.strictEqual(parseFloat(vinyl.price), 29.99);

            createdVinylId = vinyl.id;
        });

        it('should reject vinyl creation by regular user', async () => {
            const response = await fetch(`${API_BASE_URL}/vinyls`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({
                    name: 'Test Album',
                    authorName: 'Test Artist',
                    description: 'Test',
                    price: 19.99,
                }),
            });

            assert.strictEqual(response.status, 401);
        });

        it('should reject vinyl creation without auth', async () => {
            const response = await fetch(`${API_BASE_URL}/vinyls`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: 'Test Album',
                    authorName: 'Test Artist',
                    description: 'Test',
                    price: 19.99,
                }),
            });

            assert.strictEqual(response.status, 401);
        });

        it('should reject vinyl with invalid price', async () => {
            const response = await fetch(`${API_BASE_URL}/vinyls`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
                },
                body: JSON.stringify({
                    name: 'Test Album',
                    authorName: 'Test Artist',
                    description: 'Test',
                    price: -10,
                }),
            });

            assert.strictEqual(response.status, 400);
        });
    });

    describe('GET /vinyls', () => {
        before(async () => {
            const vinyls = [
                {
                    name: 'Abbey Road',
                    authorName: 'The Beatles',
                    description: 'Classic album',
                    price: 24.99,
                },
                {
                    name: 'Led Zeppelin IV',
                    authorName: 'Led Zeppelin',
                    description: 'Rock classic',
                    price: 27.99,
                },
                {
                    name: 'Thriller',
                    authorName: 'Michael Jackson',
                    description: 'Pop masterpiece',
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

        it('should get all vinyls without auth', async () => {
            const response = await fetch(`${API_BASE_URL}/vinyls`);

            assert.strictEqual(response.status, 200);

            const data = await response.json();
            assert.ok(data.data);
            assert.ok(Array.isArray(data.data));
            assert.ok(data.data.length >= 4);
            assert.ok(data.total >= 4);
            assert.strictEqual(data.page, 1);
        });

        it('should paginate vinyls correctly', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls?page=1&limit=2`
            );

            assert.strictEqual(response.status, 200);

            const data = await response.json();
            assert.strictEqual(data.data.length, 2);
            assert.strictEqual(data.limit, 2);
            assert.ok(data.totalPages >= 2);
        });

        it('should search vinyls by name', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls?search=Beatles`
            );

            assert.strictEqual(response.status, 200);

            const data = await response.json();
            assert.ok(data.data.length > 0);
            assert.ok(
                data.data[0].name.includes('Abbey') ||
                    data.data[0].authorName.includes('Beatles')
            );
        });

        it('should filter vinyls by author', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls?authorName=Pink Floyd`
            );

            assert.strictEqual(response.status, 200);

            const data = await response.json();
            assert.ok(data.data.length > 0);
            assert.strictEqual(data.data[0].authorName, 'Pink Floyd');
        });

        it('should sort vinyls by price ascending', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls?sortBy=price&order=ASC`
            );

            assert.strictEqual(response.status, 200);

            const data = await response.json();
            const prices = data.data.map((v: any) => parseFloat(v.price));
            for (let i = 0; i < prices.length - 1; i++) {
                assert.ok(prices[i] <= prices[i + 1]);
            }
        });

        it('should include average score in response', async () => {
            const response = await fetch(`${API_BASE_URL}/vinyls`);
            const data = await response.json();

            assert.ok(data.data[0].hasOwnProperty('averageScore'));
        });
    });

    describe('GET /vinyls/:id', () => {
        it('should get vinyl by id', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/${createdVinylId}`
            );

            assert.strictEqual(response.status, 200);

            const vinyl = await response.json();
            assert.strictEqual(vinyl.id, createdVinylId);
            assert.strictEqual(vinyl.name, 'Dark Side of the Moon');
            assert.ok(vinyl.hasOwnProperty('averageScore'));
        });

        it('should return 404 for non-existent vinyl', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/00000000-0000-0000-0000-000000000000`
            );

            assert.strictEqual(response.status, 404);
        });
    });

    describe('PATCH /vinyls/:id', () => {
        it('should update vinyl as admin', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/${createdVinylId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify({
                        price: 34.99,
                        description: 'Updated description',
                    }),
                }
            );

            assert.strictEqual(response.status, 200);

            const vinyl = await response.json();
            assert.strictEqual(parseFloat(vinyl.price), 34.99);
            assert.strictEqual(vinyl.description, 'Updated description');
        });

        it('should reject update by regular user', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/${createdVinylId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${userToken}`,
                    },
                    body: JSON.stringify({ price: 39.99 }),
                }
            );

            assert.strictEqual(response.status, 401);
        });

        it('should return 404 for non-existent vinyl', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/00000000-0000-0000-0000-000000000000`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${adminToken}`,
                    },
                    body: JSON.stringify({ price: 39.99 }),
                }
            );

            assert.strictEqual(response.status, 404);
        });
    });

    describe('DELETE /vinyls/:id', () => {
        let vinylToDelete: string;

        before(async () => {
            const response = await fetch(`${API_BASE_URL}/vinyls`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${adminToken}`,
                },
                body: JSON.stringify({
                    name: 'To Be Deleted',
                    authorName: 'Test Artist',
                    description: 'This will be deleted',
                    price: 15.99,
                }),
            });
            const vinyl = await response.json();
            vinylToDelete = vinyl.id;
        });

        it('should delete vinyl as admin', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/${vinylToDelete}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${adminToken}`,
                    },
                }
            );

            assert.strictEqual(response.status, 204);
        });

        it('should return 404 for deleted vinyl', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/${vinylToDelete}`
            );

            assert.strictEqual(response.status, 404);
        });

        it('should reject deletion by regular user', async () => {
            const response = await fetch(
                `${API_BASE_URL}/vinyls/${createdVinylId}`,
                {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${userToken}`,
                    },
                }
            );

            assert.strictEqual(response.status, 401);
        });
    });
});
