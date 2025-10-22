import { Test, TestingModule } from '@nestjs/testing';
import { VinylsService } from './vinyls.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Vinyl } from './entities/vinyl.entity';
import { NotFoundException } from '@nestjs/common';

describe('VinylsService', () => {
    let service: VinylsService;

    const mockRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        findAndCount: jest.fn(),
        createQueryBuilder: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                VinylsService,
                {
                    provide: getRepositoryToken(Vinyl),
                    useValue: mockRepository,
                },
            ],
        }).compile();

        service = module.get<VinylsService>(VinylsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create and save a vinyl', async () => {
            const createVinylDto = {
                name: 'Dark Side of the Moon',
                authorName: 'Pink Floyd',
                description: 'Classic rock album',
                price: 29.99,
                imageUrl: 'https://example.com/image.jpg',
            };

            const savedVinyl = {
                id: 'uuid-123',
                ...createVinylDto,
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            mockRepository.create.mockReturnValue(savedVinyl);
            mockRepository.save.mockResolvedValue(savedVinyl);

            const result = await service.create(createVinylDto);

            expect(mockRepository.create).toHaveBeenCalledWith(createVinylDto);
            expect(mockRepository.save).toHaveBeenCalledWith(savedVinyl);
            expect(result).toEqual(savedVinyl);
        });
    });

    describe('findOne', () => {
        it('should return a vinyl when found', async () => {
            const vinylId = 'uuid-123';
            const vinyl = {
                id: vinylId,
                name: 'Abbey Road',
                authorName: 'The Beatles',
                description: 'Legendary album',
                price: 31.99,
                imageUrl: 'https://example.com/image.jpg',
                isDeleted: false,
                reviews: [],
            };

            mockRepository.findOne.mockResolvedValue(vinyl);

            const result = await service.findOne(vinylId);

            expect(mockRepository.findOne).toHaveBeenCalledWith({
                where: { id: vinylId, isDeleted: false },
                relations: ['reviews'],
            });
            expect(result).toEqual(vinyl);
        });

        it('should throw NotFoundException when vinyl not found', async () => {
            const vinylId = 'nonexistent-id';
            mockRepository.findOne.mockResolvedValue(null);

            await expect(service.findOne(vinylId)).rejects.toThrow(
                NotFoundException
            );
            await expect(service.findOne(vinylId)).rejects.toThrow(
                'Vinyl not found'
            );
        });
    });

    describe('remove', () => {
        it('should soft delete a vinyl', async () => {
            const vinylId = 'uuid-123';
            const vinyl = {
                id: vinylId,
                name: 'Test Vinyl',
                isDeleted: false,
            };

            mockRepository.findOne.mockResolvedValue(vinyl);
            mockRepository.save.mockResolvedValue({
                ...vinyl,
                isDeleted: true,
            });

            await service.remove(vinylId);

            expect(mockRepository.findOne).toHaveBeenCalledWith({
                where: { id: vinylId, isDeleted: false },
            });
            expect(mockRepository.save).toHaveBeenCalledWith({
                ...vinyl,
                isDeleted: true,
            });
        });

        it('should throw NotFoundException when vinyl does not exist', async () => {
            const vinylId = 'nonexistent-id';
            mockRepository.findOne.mockResolvedValue(null);

            await expect(service.remove(vinylId)).rejects.toThrow(
                NotFoundException
            );
        });
    });

    describe('findAll', () => {
        it('should return paginated vinyls without search', async () => {
            const queryDto = {
                page: 1,
                limit: 20,
            };

            const mockVinyls = [
                {
                    id: '1',
                    name: 'Vinyl 1',
                    authorName: 'Artist 1',
                    price: 20,
                },
                {
                    id: '2',
                    name: 'Vinyl 2',
                    authorName: 'Artist 2',
                    price: 25,
                },
            ];

            mockRepository.findAndCount.mockResolvedValue([mockVinyls, 2]);

            const result = await service.findAll(queryDto);

            expect(result).toEqual({
                data: mockVinyls,
                total: 2,
                page: 1,
                limit: 20,
                totalPages: 1,
            });
        });

        it('should return paginated vinyls with search query', async () => {
            const queryDto = {
                page: 1,
                limit: 20,
                search: 'Pink Floyd',
            };

            const mockVinyls = [
                {
                    id: '1',
                    name: 'Dark Side of the Moon',
                    authorName: 'Pink Floyd',
                    price: 29.99,
                },
            ];

            const mockQueryBuilder = {
                where: jest.fn().mockReturnThis(),
                andWhere: jest.fn().mockReturnThis(),
                orderBy: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                take: jest.fn().mockReturnThis(),
                getManyAndCount: jest.fn().mockResolvedValue([mockVinyls, 1]),
            };

            mockRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder);

            const result = await service.findAll(queryDto);

            expect(mockRepository.createQueryBuilder).toHaveBeenCalledWith(
                'vinyl'
            );
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                '(vinyl.name LIKE :search OR vinyl.authorName LIKE :search)',
                { search: '%Pink Floyd%' }
            );
            expect(result).toEqual({
                data: mockVinyls,
                total: 1,
                page: 1,
                limit: 20,
                totalPages: 1,
            });
        });

        it('should filter by authorName without search', async () => {
            const queryDto = {
                page: 1,
                limit: 20,
                authorName: 'Beatles',
            };

            const mockVinyls = [
                {
                    id: '1',
                    name: 'Abbey Road',
                    authorName: 'The Beatles',
                    price: 31.99,
                },
            ];

            mockRepository.findAndCount.mockResolvedValue([mockVinyls, 1]);

            const result = await service.findAll(queryDto);

            expect(mockRepository.findAndCount).toHaveBeenCalledWith({
                where: {
                    isDeleted: false,
                    authorName: expect.anything(),
                },
                order: { createdAt: 'DESC' },
                skip: 0,
                take: 20,
            });
            expect(result.data).toEqual(mockVinyls);
        });
    });

    describe('update', () => {
        it('should update a vinyl successfully', async () => {
            const vinylId = 'vinyl-123';
            const updateDto = {
                name: 'Updated Album',
                price: 35.99,
            };

            const existingVinyl = {
                id: vinylId,
                name: 'Old Album',
                authorName: 'Artist',
                price: 29.99,
                isDeleted: false,
            };

            const updatedVinyl = {
                ...existingVinyl,
                ...updateDto,
            };

            mockRepository.findOne.mockResolvedValue(existingVinyl);
            mockRepository.save.mockResolvedValue(updatedVinyl);

            const result = await service.update(vinylId, updateDto);

            expect(mockRepository.findOne).toHaveBeenCalledWith({
                where: { id: vinylId, isDeleted: false },
            });
            expect(mockRepository.save).toHaveBeenCalled();
            expect(result.name).toBe(updateDto.name);
            expect(result.price).toBe(updateDto.price);
        });

        it('should throw NotFoundException when vinyl does not exist', async () => {
            mockRepository.findOne.mockResolvedValue(null);

            await expect(
                service.update('nonexistent', { name: 'Test' })
            ).rejects.toThrow(NotFoundException);
        });
    });

    describe('findOneWithAverageScore', () => {
        it('should return vinyl with calculated average score', async () => {
            const vinylId = 'vinyl-123';
            const vinyl = {
                id: vinylId,
                name: 'Test Album',
                authorName: 'Test Artist',
                reviews: [
                    { id: '1', score: 8, isDeleted: false },
                    { id: '2', score: 9, isDeleted: false },
                    { id: '3', score: 10, isDeleted: false },
                ],
            };

            mockRepository.findOne.mockResolvedValue(vinyl);

            const result = await service.findOneWithAverageScore(vinylId);

            expect(result.averageScore).toBe(9);
            expect(result.id).toBe(vinylId);
        });

        it('should return 0 average score when no reviews', async () => {
            const vinylId = 'vinyl-123';
            const vinyl = {
                id: vinylId,
                name: 'Test Album',
                reviews: [],
            };

            mockRepository.findOne.mockResolvedValue(vinyl);

            const result = await service.findOneWithAverageScore(vinylId);

            expect(result.averageScore).toBe(0);
        });

        it('should exclude deleted reviews from average calculation', async () => {
            const vinylId = 'vinyl-123';
            const vinyl = {
                id: vinylId,
                name: 'Test Album',
                reviews: [
                    { id: '1', score: 10, isDeleted: false },
                    { id: '2', score: 2, isDeleted: true },
                    { id: '3', score: 8, isDeleted: false },
                ],
            };

            mockRepository.findOne.mockResolvedValue(vinyl);

            const result = await service.findOneWithAverageScore(vinylId);

            expect(result.averageScore).toBe(9);
        });
    });
});
