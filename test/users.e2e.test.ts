import { describe, it, before, after } from 'node:test';
import assert from 'node:assert';
import { TestSetup, API_BASE_URL } from './test-setup';

describe('Users E2E Tests', () => {
    let userToken: string;
    let userId: string;

    before(async () => {
        await TestSetup.initialize();
        await TestSetup.cleanup();

        const response = await fetch(`${API_BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'testuser@profile.test',
                password: 'UserPass123!',
                firstName: 'Test',
                lastName: 'User',
            }),
        });

        const data = await response.json();
        userToken = data.accessToken;
        userId = data.user.id;
    });

    after(async () => {
        await TestSetup.cleanup();
        await TestSetup.destroy();
    });

    describe('GET /users/profile', () => {
        it('should get user profile', async () => {
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            });

            assert.strictEqual(response.status, 200);

            const profile = await response.json();
            assert.strictEqual(profile.id, userId);
            assert.strictEqual(profile.email, 'testuser@profile.test');
            assert.strictEqual(profile.firstName, 'Test');
            assert.strictEqual(profile.lastName, 'User');
            assert.ok(Array.isArray(profile.reviews));
            assert.ok(Array.isArray(profile.orders));
        });

        it('should reject request without auth', async () => {
            const response = await fetch(`${API_BASE_URL}/users/profile`);

            assert.strictEqual(response.status, 401);
        });
    });

    describe('PATCH /users/profile', () => {
        it('should update profile successfully', async () => {
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({
                    firstName: 'Updated',
                    lastName: 'Name',
                    birthDate: '1990-01-15',
                    avatar: 'https://example.com/avatar.jpg',
                }),
            });

            assert.strictEqual(response.status, 200);

            const profile = await response.json();
            assert.strictEqual(profile.firstName, 'Updated');
            assert.strictEqual(profile.lastName, 'Name');
            assert.strictEqual(profile.avatar, 'https://example.com/avatar.jpg');
        });

        it('should update partial profile', async () => {
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({
                    firstName: 'JustFirstName',
                }),
            });

            assert.strictEqual(response.status, 200);

            const profile = await response.json();
            assert.strictEqual(profile.firstName, 'JustFirstName');
            assert.strictEqual(profile.lastName, 'Name'); // Should remain unchanged
        });

        it('should reject invalid birth date', async () => {
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${userToken}`,
                },
                body: JSON.stringify({
                    birthDate: 'invalid-date',
                }),
            });

            assert.strictEqual(response.status, 400);
        });
    });

    describe('DELETE /users/profile', () => {
        it('should soft delete user account', async () => {
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            });

            assert.strictEqual(response.status, 204);
        });

        it('should not allow access after deletion', async () => {
            const response = await fetch(`${API_BASE_URL}/users/profile`, {
                headers: {
                    Authorization: `Bearer ${userToken}`,
                },
            });

            assert.strictEqual(response.status, 401);
        });

        it('should not allow login after deletion', async () => {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: 'testuser@profile.test',
                    password: 'UserPass123!',
                }),
            });

            assert.strictEqual(response.status, 401);
        });
    });
});