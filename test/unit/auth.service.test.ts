import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { AuthService } from '../../src/auth/auth.service';

describe('AuthService', () => {
    let service: any;
    let usersService: any;
    let jwtService: any;

    beforeEach(() => {
        usersService = {
            findByGoogleId: mock.fn(),
            findByEmail: mock.fn(),
            findById: mock.fn(),
            findByEmailWithPassword: mock.fn(),
            createFromGoogle: mock.fn(),
            updateFromGoogle: mock.fn(),
            createLocal: mock.fn(),
            validatePassword: mock.fn(),
            changePassword: mock.fn(),
        };

        jwtService = {
            sign: mock.fn(() => 'mock-jwt-token'),
        };

        service = new AuthService(usersService, jwtService);
    });

    describe('googleLogin', () => {
        it('should create new user if not exists', async () => {
            const googleUser = {
                googleId: 'google-123',
                email: 'test@gmail.com',
                firstName: 'John',
                lastName: 'Doe',
                avatar: 'avatar.jpg',
            };

            const createdUser = {
                id: 'user-1',
                ...googleUser,
                role: 'user',
            };

            usersService.findByGoogleId.mock.mockImplementation(() =>
                Promise.resolve(null)
            );
            usersService.createFromGoogle.mock.mockImplementation(() =>
                Promise.resolve(createdUser)
            );

            const result = await service.googleLogin(googleUser);

            assert.strictEqual(usersService.findByGoogleId.mock.callCount(), 1);
            assert.strictEqual(
                usersService.createFromGoogle.mock.callCount(),
                1
            );
            assert.strictEqual(
                usersService.updateFromGoogle.mock.callCount(),
                0
            );
            assert.strictEqual(result.accessToken, 'mock-jwt-token');
            assert.strictEqual(result.user.email, 'test@gmail.com');
        });

        it('should update existing user', async () => {
            const googleUser = {
                googleId: 'google-123',
                email: 'updated@gmail.com',
                firstName: 'Jane',
                lastName: 'Smith',
                avatar: 'new-avatar.jpg',
            };

            const existingUser = {
                id: 'user-1',
                googleId: 'google-123',
                email: 'old@gmail.com',
                firstName: 'John',
                lastName: 'Doe',
                role: 'user',
            };

            const updatedUser = {
                ...existingUser,
                ...googleUser,
            };

            usersService.findByGoogleId.mock.mockImplementation(() =>
                Promise.resolve(existingUser)
            );
            usersService.updateFromGoogle.mock.mockImplementation(() =>
                Promise.resolve(updatedUser)
            );

            const result = await service.googleLogin(googleUser);

            assert.strictEqual(usersService.findByGoogleId.mock.callCount(), 1);
            assert.strictEqual(
                usersService.updateFromGoogle.mock.callCount(),
                1
            );
            assert.strictEqual(
                usersService.createFromGoogle.mock.callCount(),
                0
            );
            assert.strictEqual(result.user.email, 'updated@gmail.com');
        });

        it('should generate JWT token', async () => {
            const googleUser = {
                googleId: 'google-123',
                email: 'test@gmail.com',
                firstName: 'John',
                lastName: 'Doe',
                avatar: 'avatar.jpg',
            };

            const user = { id: 'user-1', ...googleUser, role: 'user' };

            usersService.findByGoogleId.mock.mockImplementation(() =>
                Promise.resolve(null)
            );
            usersService.createFromGoogle.mock.mockImplementation(() =>
                Promise.resolve(user)
            );

            const result = await service.googleLogin(googleUser);

            assert.strictEqual(jwtService.sign.mock.callCount(), 1);
            assert.strictEqual(result.accessToken, 'mock-jwt-token');
        });
    });

    describe('register', () => {
        it('should register new user successfully', async () => {
            const registerDto = {
                email: 'newuser@test.com',
                password: 'Password123!',
                firstName: 'John',
                lastName: 'Doe',
            };

            const createdUser = {
                id: 'user-1',
                email: registerDto.email,
                firstName: registerDto.firstName,
                lastName: registerDto.lastName,
                avatar: null,
                role: 'user',
            };

            usersService.findByEmail.mock.mockImplementation(() =>
                Promise.resolve(null)
            );
            usersService.createLocal.mock.mockImplementation(() =>
                Promise.resolve(createdUser)
            );

            const result = await service.register(registerDto);

            assert.strictEqual(usersService.findByEmail.mock.callCount(), 1);
            assert.strictEqual(usersService.createLocal.mock.callCount(), 1);
            assert.strictEqual(result.accessToken, 'mock-jwt-token');
            assert.strictEqual(result.user.email, registerDto.email);
        });

        it('should throw BadRequestException if email exists', async () => {
            const registerDto = {
                email: 'existing@test.com',
                password: 'Password123!',
                firstName: 'John',
                lastName: 'Doe',
            };

            const existingUser = { id: 'user-1', email: registerDto.email };

            usersService.findByEmail.mock.mockImplementation(() =>
                Promise.resolve(existingUser)
            );

            await assert.rejects(() => service.register(registerDto), {
                name: 'BadRequestException',
                message: 'Email already exists',
            });

            assert.strictEqual(usersService.createLocal.mock.callCount(), 0);
        });

        it('should pass all fields to createLocal', async () => {
            const registerDto = {
                email: 'test@test.com',
                password: 'Password123!',
                firstName: 'John',
                lastName: 'Doe',
            };

            const user = { id: 'user-1', ...registerDto, role: 'user' };

            usersService.findByEmail.mock.mockImplementation(() =>
                Promise.resolve(null)
            );
            usersService.createLocal.mock.mockImplementation(() =>
                Promise.resolve(user)
            );

            await service.register(registerDto);

            const createLocalCall =
                usersService.createLocal.mock.calls[0].arguments;
            assert.strictEqual(createLocalCall[0], registerDto.email);
            assert.strictEqual(createLocalCall[1], registerDto.password);
            assert.strictEqual(createLocalCall[2], registerDto.firstName);
            assert.strictEqual(createLocalCall[3], registerDto.lastName);
        });
    });

    describe('login', () => {
        it('should login user with valid credentials', async () => {
            const loginDto = {
                email: 'test@test.com',
                password: 'Password123!',
            };

            const user = {
                id: 'user-1',
                email: loginDto.email,
                password: 'hashed-password',
                firstName: 'John',
                lastName: 'Doe',
                avatar: null,
                role: 'user',
            };

            usersService.findByEmailWithPassword.mock.mockImplementation(() =>
                Promise.resolve(user)
            );
            usersService.validatePassword.mock.mockImplementation(() =>
                Promise.resolve(true)
            );

            const result = await service.login(loginDto);

            assert.strictEqual(
                usersService.findByEmailWithPassword.mock.callCount(),
                1
            );
            assert.strictEqual(
                usersService.validatePassword.mock.callCount(),
                1
            );
            assert.strictEqual(result.accessToken, 'mock-jwt-token');
            assert.strictEqual(result.user.email, loginDto.email);
        });

        it('should throw UnauthorizedException if user not found', async () => {
            const loginDto = {
                email: 'notfound@test.com',
                password: 'Password123!',
            };

            usersService.findByEmailWithPassword.mock.mockImplementation(() =>
                Promise.resolve(null)
            );

            await assert.rejects(() => service.login(loginDto), {
                name: 'UnauthorizedException',
                message: 'Invalid credentials',
            });

            assert.strictEqual(
                usersService.validatePassword.mock.callCount(),
                0
            );
        });

        it('should throw UnauthorizedException if password invalid', async () => {
            const loginDto = {
                email: 'test@test.com',
                password: 'WrongPassword!',
            };

            const user = {
                id: 'user-1',
                email: loginDto.email,
                password: 'hashed-password',
            };

            usersService.findByEmailWithPassword.mock.mockImplementation(() =>
                Promise.resolve(user)
            );
            usersService.validatePassword.mock.mockImplementation(() =>
                Promise.resolve(false)
            );

            await assert.rejects(() => service.login(loginDto), {
                name: 'UnauthorizedException',
                message: 'Invalid credentials',
            });
        });

        it('should call validatePassword with correct parameters', async () => {
            const loginDto = {
                email: 'test@test.com',
                password: 'Password123!',
            };

            const user = {
                id: 'user-1',
                email: loginDto.email,
                password: 'hashed',
            };

            usersService.findByEmailWithPassword.mock.mockImplementation(() =>
                Promise.resolve(user)
            );
            usersService.validatePassword.mock.mockImplementation(() =>
                Promise.resolve(true)
            );

            await service.login(loginDto);

            const validateCall =
                usersService.validatePassword.mock.calls[0].arguments;
            assert.strictEqual(validateCall[0], user);
            assert.strictEqual(validateCall[1], loginDto.password);
        });
    });

    describe('validateUser', () => {
        it('should validate user from JWT payload', async () => {
            const payload = {
                sub: 'user-1',
                email: 'test@test.com',
                role: 'user',
            };

            const user = { id: 'user-1', email: 'test@test.com' };

            usersService.findById.mock.mockImplementation(() =>
                Promise.resolve(user)
            );

            const result = await service.validateUser(payload);

            assert.strictEqual(usersService.findById.mock.callCount(), 1);
            assert.strictEqual(result.id, 'user-1');
        });

        it('should return null if user not found', async () => {
            const payload = {
                sub: 'not-exist',
                email: 'test@test.com',
                role: 'user',
            };

            usersService.findById.mock.mockImplementation(() =>
                Promise.resolve(null)
            );

            const result = await service.validateUser(payload);

            assert.strictEqual(result, null);
        });
    });

    describe('changePassword', () => {
        it('should change password successfully', async () => {
            const userId = 'user-1';
            const changePasswordDto = {
                currentPassword: 'OldPass123!',
                newPassword: 'NewPass456!',
                confirmPassword: 'NewPass456!',
            };

            usersService.changePassword.mock.mockImplementation(() =>
                Promise.resolve()
            );

            const result = await service.changePassword(
                userId,
                changePasswordDto
            );

            assert.strictEqual(usersService.changePassword.mock.callCount(), 1);
            assert.strictEqual(result.message, 'Password changed successfully');

            const changeCall =
                usersService.changePassword.mock.calls[0].arguments;
            assert.strictEqual(changeCall[0], userId);
            assert.strictEqual(
                changeCall[1],
                changePasswordDto.currentPassword
            );
            assert.strictEqual(changeCall[2], changePasswordDto.newPassword);
        });

        it('should throw BadRequestException if passwords do not match', async () => {
            const userId = 'user-1';
            const changePasswordDto = {
                currentPassword: 'OldPass123!',
                newPassword: 'NewPass456!',
                confirmPassword: 'DifferentPass!',
            };

            await assert.rejects(
                () => service.changePassword(userId, changePasswordDto),
                {
                    name: 'BadRequestException',
                    message: 'New passwords do not match',
                }
            );

            assert.strictEqual(usersService.changePassword.mock.callCount(), 0);
        });

        it('should throw BadRequestException if new password same as current', async () => {
            const userId = 'user-1';
            const changePasswordDto = {
                currentPassword: 'SamePass123!',
                newPassword: 'SamePass123!',
                confirmPassword: 'SamePass123!',
            };

            await assert.rejects(
                () => service.changePassword(userId, changePasswordDto),
                {
                    name: 'BadRequestException',
                    message:
                        'New password must be different from current password',
                }
            );

            assert.strictEqual(usersService.changePassword.mock.callCount(), 0);
        });

        it('should validate confirm password before calling service', async () => {
            const userId = 'user-1';
            const changePasswordDto = {
                currentPassword: 'Old123!',
                newPassword: 'New456!',
                confirmPassword: 'Wrong456!',
            };

            await assert.rejects(
                () => service.changePassword(userId, changePasswordDto),
                { name: 'BadRequestException' }
            );

            assert.strictEqual(usersService.changePassword.mock.callCount(), 0);
        });
    });
});
