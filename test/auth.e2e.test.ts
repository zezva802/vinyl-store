import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import {
    TestSetup,
    API_BASE_URL,
    TEST_USERS,
    TestUser,
} from './test-setup';

describe('Auth E2E Tests', () => {
    let adminUser: TestUser;
    let regularUser: TestUser;

    before(async () => {
        await TestSetup.initialize();
        await TestSetup.cleanup();
    });

    after(async () => {
        await TestSetup.cleanup();
        await TestSetup.destroy();
    });

    describe('POST /auth/register', () => {
        it('should register a new user successfully', async () => {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(TEST_USERS.user1),
            });

            assert.strictEqual(response.status, 201);

            const data = await response.json();
            assert.ok(data.accessToken);
            assert.strictEqual(data.user.email, TEST_USERS.user1.email);
            assert.strictEqual(data.user.role, 'user');

            regularUser = {
                id: data.user.id,
                email: data.user.email,
                token: data.accessToken,
                role: 'user',
            };
        });

        it('should reject registration with existing email', async () => {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(TEST_USERS.user1),
            });

            assert.strictEqual(response.status, 400);

            const data = await response.json();
            assert.ok(data.message.includes('Email already exists'));
        });

        it('should reject registration with invalid data', async () => {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'invalid-email',
                    password: 'short',
                }),
            });

            assert.strictEqual(response.status, 400);
        });

        it('should register admin user for testing', async () => {
            const response = await fetch(`${API_BASE_URL}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(TEST_USERS.admin),
            });

            const data = await response.json();
            adminUser = {
                id: data.user.id,
                email: data.user.email,
                token: data.accessToken,
                role: 'user',
            };

            const dataSource = TestSetup.getDataSource();
            await dataSource.query(
                'UPDATE users SET role = ? WHERE id = ?',
                ['admin', adminUser.id]
            );

            adminUser.role = 'admin';
        });
    });

    describe('POST /auth/login', () => {
        it('should login with valid credentials', async () => {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: TEST_USERS.user1.email,
                    password: TEST_USERS.user1.password,
                }),
            });

            assert.strictEqual(response.status, 201);

            const data = await response.json();
            assert.ok(data.accessToken);
            assert.strictEqual(data.user.email, TEST_USERS.user1.email);
        });

        it('should reject login with invalid password', async () => {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: TEST_USERS.user1.email,
                    password: 'WrongPassword123!',
                }),
            });

            assert.strictEqual(response.status, 401);
        });

        it('should reject login with non-existent email', async () => {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'nonexistent@test.com',
                    password: 'Password123!',
                }),
            });

            assert.strictEqual(response.status, 401);
        });
    });

    describe('GET /auth/me', () => {
        it('should return current user profile', async () => {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    Authorization: `Bearer ${regularUser.token}`,
                },
            });

            assert.strictEqual(response.status, 200);

            const data = await response.json();
            assert.strictEqual(data.id, regularUser.id);
            assert.strictEqual(data.email, regularUser.email);
        });

        it('should reject request without token', async () => {
            const response = await fetch(`${API_BASE_URL}/auth/me`);

            assert.strictEqual(response.status, 401);
        });

        it('should reject request with invalid token', async () => {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    Authorization: 'Bearer invalid_token_here',
                },
            });

            assert.strictEqual(response.status, 401);
        });
    });

    describe('POST /auth/change-password', () => {
        it('should change password successfully', async () => {
            const response = await fetch(
                `${API_BASE_URL}/auth/change-password`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${regularUser.token}`,
                    },
                    body: JSON.stringify({
                        currentPassword: TEST_USERS.user1.password,
                        newPassword: 'NewPassword123!',
                        confirmPassword: 'NewPassword123!',
                    }),
                }
            );

            assert.strictEqual(response.status, 201);

            const data = await response.json();
            assert.ok(data.message.includes('Password changed'));
        });

        it('should login with new password', async () => {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: TEST_USERS.user1.email,
                    password: 'NewPassword123!',
                }),
            });

            assert.strictEqual(response.status, 201);

            const data = await response.json();
            regularUser.token = data.accessToken;
        });

        it('should reject password change with wrong current password', async () => {
            const response = await fetch(
                `${API_BASE_URL}/auth/change-password`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${regularUser.token}`,
                    },
                    body: JSON.stringify({
                        currentPassword: 'WrongPassword123!',
                        newPassword: 'AnotherPassword123!',
                        confirmPassword: 'AnotherPassword123!',
                    }),
                }
            );

            assert.strictEqual(response.status, 401);
        });

        it('should reject when new passwords do not match', async () => {
            const response = await fetch(
                `${API_BASE_URL}/auth/change-password`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${regularUser.token}`,
                    },
                    body: JSON.stringify({
                        currentPassword: 'NewPassword123!',
                        newPassword: 'DifferentPassword123!',
                        confirmPassword: 'MismatchPassword123!',
                    }),
                }
            );

            assert.strictEqual(response.status, 400);
        });
    });

    describe('POST /auth/logout', () => {
        it('should logout successfully', async () => {
            const response = await fetch(`${API_BASE_URL}/auth/logout`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${regularUser.token}`,
                },
            });

            assert.strictEqual(response.status, 201);

            const data = await response.json();
            assert.ok(data.message.includes('Logged out'));
        });

        it('should reject using blacklisted token', async () => {
            const response = await fetch(`${API_BASE_URL}/auth/me`, {
                headers: {
                    Authorization: `Bearer ${regularUser.token}`,
                },
            });

            assert.strictEqual(response.status, 401);
        });

        it('should get new token after logout', async () => {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: TEST_USERS.user1.email,
                    password: 'NewPassword123!',
                }),
            });

            const data = await response.json();
            regularUser.token = data.accessToken;
        });
    });
});