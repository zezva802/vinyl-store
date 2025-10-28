import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { UsersService } from '../../src/users/users.service';
import * as bcrypt from 'bcrypt';

describe('UsersService', () => {
    let service: any;
    let repository: any;

    beforeEach(() => {
        // Create mock repository
        repository = {
            findOne: mock.fn(),
            create: mock.fn(),
            save: mock.fn(),
            createQueryBuilder: mock.fn(),
        };

        service = new UsersService(repository);
    });

    describe('findByGoogleId', () => {
        it('should find user by google id', async () => {
            const mockUser = { id: '1', googleId: 'google-123', email: 'test@test.com' };
            repository.findOne.mock.mockImplementation(() => Promise.resolve(mockUser));

            const result = await service.findByGoogleId('google-123');

            assert.strictEqual(result.googleId, 'google-123');
            assert.strictEqual(repository.findOne.mock.callCount(), 1);
        });

        it('should return null when not found', async () => {
            repository.findOne.mock.mockImplementation(() => Promise.resolve(null));

            const result = await service.findByGoogleId('not-exist');

            assert.strictEqual(result, null);
        });
    });

    describe('findByEmail', () => {
        it('should find user by email', async () => {
            const mockUser = { id: '1', email: 'test@test.com' };
            repository.findOne.mock.mockImplementation(() => Promise.resolve(mockUser));

            const result = await service.findByEmail('test@test.com');

            assert.strictEqual(result.email, 'test@test.com');
        });

        it('should return null when not found', async () => {
            repository.findOne.mock.mockImplementation(() => Promise.resolve(null));

            const result = await service.findByEmail('not@exist.com');

            assert.strictEqual(result, null);
        });
    });

    describe('findById', () => {
        it('should find user by id', async () => {
            const mockUser = { id: 'user-123' };
            repository.findOne.mock.mockImplementation(() => Promise.resolve(mockUser));

            const result = await service.findById('user-123');

            assert.strictEqual(result.id, 'user-123');
        });

        it('should return null when not found', async () => {
            repository.findOne.mock.mockImplementation(() => Promise.resolve(null));

            const result = await service.findById('not-exist');

            assert.strictEqual(result, null);
        });
    });

    describe('createFromGoogle', () => {
        it('should create user from google data', async () => {
            const googleUser = {
                googleId: 'g-123',
                email: 'test@gmail.com',
                firstName: 'John',
                lastName: 'Doe',
                avatar: 'avatar.jpg',
            };

            const createdUser = { id: 'new-id', ...googleUser };
            repository.create.mock.mockImplementation((data: any) => data);
            repository.save.mock.mockImplementation((user: any) => Promise.resolve(createdUser));

            const result = await service.createFromGoogle(googleUser);

            assert.strictEqual(repository.create.mock.callCount(), 1);
            assert.strictEqual(repository.save.mock.callCount(), 1);
            assert.ok(result);
        });
    });

    describe('updateFromGoogle', () => {
        it('should update user with google data', async () => {
            const user = { id: '1', email: 'old@test.com', firstName: 'Old' };
            const googleUser = {
                googleId: 'g-123',
                email: 'new@test.com',
                firstName: 'New',
                lastName: 'Name',
                avatar: 'new.jpg',
            };

            repository.save.mock.mockImplementation((u: any) => Promise.resolve(u));

            const result = await service.updateFromGoogle(user, googleUser);

            assert.strictEqual(result.email, 'new@test.com');
            assert.strictEqual(result.firstName, 'New');
        });
    });

    describe('getProfile', () => {
        it('should return user profile with relations', async () => {
            const mockUser = { id: 'user-1', email: 'test@test.com' };
            repository.findOne.mock.mockImplementation(() => Promise.resolve(mockUser));

            const result = await service.getProfile('user-1');

            assert.strictEqual(result.id, 'user-1');
        });

        it('should throw NotFoundException when not found', async () => {
            repository.findOne.mock.mockImplementation(() => Promise.resolve(null));

            await assert.rejects(
                () => service.getProfile('not-exist'),
                { name: 'NotFoundException' }
            );
        });
    });

    describe('updateProfile', () => {
        it('should update user profile', async () => {
            const existingUser = {
                id: 'user-1',
                firstName: 'Old',
                lastName: 'Name',
            };

            repository.findOne.mock.mockImplementation(() => Promise.resolve(existingUser));
            repository.save.mock.mockImplementation((u: any) => Promise.resolve(u));

            const updateData = { firstName: 'New', birthDate: '1990-01-15' };
            const result = await service.updateProfile('user-1', updateData);

            assert.strictEqual(result.firstName, 'New');
            assert.ok(result.birthDate);
        });

        it('should throw NotFoundException when not found', async () => {
            repository.findOne.mock.mockImplementation(() => Promise.resolve(null));

            await assert.rejects(
                () => service.updateProfile('not-exist', { firstName: 'Test' }),
                { name: 'NotFoundException' }
            );
        });
    });

    describe('deleteAccount', () => {
        it('should soft delete user', async () => {
            const user = { id: 'user-1', isDeleted: false };
            repository.findOne.mock.mockImplementation(() => Promise.resolve(user));
            repository.save.mock.mockImplementation((u: any) => Promise.resolve(u));

            await service.deleteAccount('user-1');

            assert.strictEqual(repository.save.mock.callCount(), 1);
            const saved = repository.save.mock.calls[0].arguments[0];
            assert.strictEqual(saved.isDeleted, true);
        });

        it('should throw NotFoundException when not found', async () => {
            repository.findOne.mock.mockImplementation(() => Promise.resolve(null));

            await assert.rejects(
                () => service.deleteAccount('not-exist'),
                { name: 'NotFoundException' }
            );
        });
    });

    describe('createLocal', () => {
        it('should create user with hashed password', async () => {
            repository.create.mock.mockImplementation((data: any) => data);
            repository.save.mock.mockImplementation((u: any) => Promise.resolve(u));

            await service.createLocal('test@test.com', 'password123', 'John', 'Doe');

            assert.strictEqual(repository.create.mock.callCount(), 1);
            assert.strictEqual(repository.save.mock.callCount(), 1);

            const createArgs = repository.create.mock.calls[0].arguments[0];
            assert.strictEqual(createArgs.email, 'test@test.com');
            assert.ok(createArgs.password);
            assert.notStrictEqual(createArgs.password, 'password123');
        });
    });

    describe('validatePassword', () => {
        it('should return true for correct password', async () => {
            const password = 'password123';
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = { id: '1', password: hashedPassword };

            const result = await service.validatePassword(user, password);

            assert.strictEqual(result, true);
        });

        it('should return false for incorrect password', async () => {
            const password = 'password123';
            const hashedPassword = await bcrypt.hash(password, 10);
            const user = { id: '1', password: hashedPassword };

            const result = await service.validatePassword(user, 'wrongpassword');

            assert.strictEqual(result, false);
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            const currentPassword = 'oldpass123';
            const hashedPassword = await bcrypt.hash(currentPassword, 10);
            const mockUser = { id: 'user-1', password: hashedPassword };

            const queryBuilder = {
                addSelect: mock.fn(function() { return this; }),
                where: mock.fn(function() { return this; }),
                andWhere: mock.fn(function() { return this; }),
                getOne: mock.fn(() => Promise.resolve(mockUser)),
            };

            repository.createQueryBuilder.mock.mockImplementation(() => queryBuilder);
            repository.save.mock.mockImplementation((u: any) => Promise.resolve(u));

            await service.changePassword('user-1', currentPassword, 'newpass123');

            assert.strictEqual(repository.save.mock.callCount(), 1);
            const saved = repository.save.mock.calls[0].arguments[0];
            assert.ok(saved.password);
            assert.notStrictEqual(saved.password, hashedPassword);
        });

        it('should throw UnauthorizedException for wrong password', async () => {
            const hashedPassword = await bcrypt.hash('correctpass', 10);
            const mockUser = { id: 'user-1', password: hashedPassword };

            const queryBuilder = {
                addSelect: mock.fn(function() { return this; }),
                where: mock.fn(function() { return this; }),
                andWhere: mock.fn(function() { return this; }),
                getOne: mock.fn(() => Promise.resolve(mockUser)),
            };

            repository.createQueryBuilder.mock.mockImplementation(() => queryBuilder);

            await assert.rejects(
                () => service.changePassword('user-1', 'wrongpass', 'newpass'),
                { name: 'UnauthorizedException' }
            );
        });

        it('should throw BadRequestException for OAuth users', async () => {
            const mockUser = { id: 'user-1', password: null };

            const queryBuilder = {
                addSelect: mock.fn(function() { return this; }),
                where: mock.fn(function() { return this; }),
                andWhere: mock.fn(function() { return this; }),
                getOne: mock.fn(() => Promise.resolve(mockUser)),
            };

            repository.createQueryBuilder.mock.mockImplementation(() => queryBuilder);

            await assert.rejects(
                () => service.changePassword('user-1', 'any', 'newpass'),
                { name: 'BadRequestException' }
            );
        });

        it('should throw NotFoundException when user not found', async () => {
            const queryBuilder = {
                addSelect: mock.fn(function() { return this; }),
                where: mock.fn(function() { return this; }),
                andWhere: mock.fn(function() { return this; }),
                getOne: mock.fn(() => Promise.resolve(null)),
            };

            repository.createQueryBuilder.mock.mockImplementation(() => queryBuilder);

            await assert.rejects(
                () => service.changePassword('not-exist', 'old', 'new'),
                { name: 'NotFoundException' }
            );
        });
    });

    describe('findByEmailWithPassword', () => {
        it('should return user with password field', async () => {
            const mockUser = { id: 'user-1', email: 'test@test.com', password: 'hashed' };

            const queryBuilder = {
                addSelect: mock.fn(function() { return this; }),
                where: mock.fn(function() { return this; }),
                andWhere: mock.fn(function() { return this; }),
                getOne: mock.fn(() => Promise.resolve(mockUser)),
            };

            repository.createQueryBuilder.mock.mockImplementation(() => queryBuilder);

            const result = await service.findByEmailWithPassword('test@test.com');

            assert.strictEqual(result.email, 'test@test.com');
            assert.ok(result.password);
        });

        it('should return null when not found', async () => {
            const queryBuilder = {
                addSelect: mock.fn(function() { return this; }),
                where: mock.fn(function() { return this; }),
                andWhere: mock.fn(function() { return this; }),
                getOne: mock.fn(() => Promise.resolve(null)),
            };

            repository.createQueryBuilder.mock.mockImplementation(() => queryBuilder);

            const result = await service.findByEmailWithPassword('not@exist.com');

            assert.strictEqual(result, null);
        });
    });
});