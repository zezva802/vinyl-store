import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { User, UserRole } from './entities/user.entity';
import { NotFoundException } from '@nestjs/common';

describe('UsersService', () => {
    let service: UsersService;

    const mockUserRepository = {
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                UsersService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
            ],
        }).compile();

        service = module.get<UsersService>(UsersService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('findByGoogleId', () => {
        it('should find user by Google ID', async () => {
            const googleId = 'google-123';
            const mockUser = {
                id: 'user-1',
                googleId,
                email: 'test@example.com',
                isDeleted: false,
            };

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.findByGoogleId(googleId);

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { googleId, isDeleted: false },
            });
            expect(result).toEqual(mockUser);
        });

        it('should return null when user not found', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            const result = await service.findByGoogleId('nonexistent');

            expect(result).toBeNull();
        });
    });

    describe('findByEmail', () => {
        it('should find user by email', async () => {
            const email = 'test@example.com';
            const mockUser = {
                id: 'user-1',
                email,
                isDeleted: false,
            };

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.findByEmail(email);

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { email, isDeleted: false },
            });
            expect(result).toEqual(mockUser);
        });
    });

    describe('findById', () => {
        it('should find user by ID', async () => {
            const userId = 'user-123';
            const mockUser = {
                id: userId,
                email: 'test@example.com',
                isDeleted: false,
            };

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.findById(userId);

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: userId, isDeleted: false },
            });
            expect(result).toEqual(mockUser);
        });
    });

    describe('createFromGoogle', () => {
        it('should create user from Google profile', async () => {
            const googleUser = {
                googleId: 'google-123',
                email: 'newuser@example.com',
                firstName: 'John',
                lastName: 'Doe',
                avatar: 'https://example.com/avatar.jpg',
            };

            const mockCreatedUser = {
                id: 'user-new',
                ...googleUser,
                role: UserRole.USER,
                isDeleted: false,
            };

            mockUserRepository.create.mockReturnValue(mockCreatedUser);
            mockUserRepository.save.mockResolvedValue(mockCreatedUser);

            const result = await service.createFromGoogle(googleUser);

            expect(mockUserRepository.create).toHaveBeenCalledWith(googleUser);
            expect(mockUserRepository.save).toHaveBeenCalledWith(
                mockCreatedUser
            );
            expect(result).toEqual(mockCreatedUser);
        });
    });

    describe('updateFromGoogle', () => {
        it('should update user with Google profile data', async () => {
            const existingUser = {
                id: 'user-1',
                googleId: 'google-123',
                email: 'old@example.com',
                firstName: 'OldFirst',
                lastName: 'OldLast',
                avatar: 'https://example.com/old.jpg',
            } as User;

            const googleUser = {
                googleId: 'google-123',
                email: 'new@example.com',
                firstName: 'NewFirst',
                lastName: 'NewLast',
                avatar: 'https://example.com/new.jpg',
            };

            mockUserRepository.save.mockImplementation((user) => {
                return Promise.resolve(user);
            });

            await service.updateFromGoogle(existingUser, googleUser);

            expect(existingUser.email).toBe('new@example.com');
            expect(existingUser.firstName).toBe('NewFirst');
            expect(existingUser.lastName).toBe('NewLast');
            expect(existingUser.avatar).toBe('https://example.com/new.jpg');
            expect(mockUserRepository.save).toHaveBeenCalled();
        });
    });

    describe('getProfile', () => {
        it('should return user profile with relations', async () => {
            const userId = 'user-123';
            const mockUser = {
                id: userId,
                email: 'test@example.com',
                reviews: [],
                orders: [],
                isDeleted: false,
            };

            mockUserRepository.findOne.mockResolvedValue(mockUser);

            const result = await service.getProfile(userId);

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: userId, isDeleted: false },
                relations: ['reviews', 'orders'],
            });
            expect(result).toEqual(mockUser);
        });

        it('should throw NotFoundException when user not found', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.getProfile('nonexistent')).rejects.toThrow(
                NotFoundException
            );
        });
    });

    describe('updateProfile', () => {
        it('should update user profile fields', async () => {
            const userId = 'user-123';
            const updateData = {
                firstName: 'Updated',
                lastName: 'Name',
                birthDate: '1990-01-01',
                avatar: 'https://example.com/new-avatar.jpg',
            };

            const existingUser = {
                id: userId,
                googleId: 'google-123',
                email: 'test@example.com',
                firstName: 'Old',
                lastName: 'Name',
                birthDate: new Date('1985-01-01'),
                avatar: 'https://example.com/old-avatar.jpg',
                role: UserRole.USER,
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                reviews: [],
                orders: [],
            } as User;

            const updatedUser = {
                ...existingUser,
                firstName: updateData.firstName,
                lastName: updateData.lastName,
                birthDate: new Date(updateData.birthDate),
                avatar: updateData.avatar,
            };

            mockUserRepository.findOne.mockResolvedValue(existingUser);
            mockUserRepository.save.mockResolvedValue(updatedUser);

            await service.updateProfile(userId, updateData);

            expect(mockUserRepository.findOne).toHaveBeenCalledWith({
                where: { id: userId, isDeleted: false },
            });
            expect(mockUserRepository.save).toHaveBeenCalled();
            expect(existingUser.firstName).toBe(updateData.firstName);
            expect(existingUser.lastName).toBe(updateData.lastName);
            expect(existingUser.avatar).toBe(updateData.avatar);
        });

        it('should throw NotFoundException when user not found', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(
                service.updateProfile('nonexistent', { firstName: 'Test' })
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('deleteAccount', () => {
        it('should soft delete user account', async () => {
            const userId = 'user-123';
            const mockUser = {
                id: userId,
                email: 'test@example.com',
                isDeleted: false,
            } as User;

            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockUserRepository.save.mockResolvedValue({
                ...mockUser,
                isDeleted: true,
            });

            await service.deleteAccount(userId);

            expect(mockUserRepository.save).toHaveBeenCalledWith({
                ...mockUser,
                isDeleted: true,
            });
        });

        it('should throw NotFoundException when user not found', async () => {
            mockUserRepository.findOne.mockResolvedValue(null);

            await expect(service.deleteAccount('nonexistent')).rejects.toThrow(
                NotFoundException
            );
        });
    });
});
