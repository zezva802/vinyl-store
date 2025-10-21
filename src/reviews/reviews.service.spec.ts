import { Test, TestingModule } from '@nestjs/testing';
import { ReviewsService } from './reviews.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Review } from './entities/review.entity';
import { VinylsService } from '../vinyls/vinyls.service';
import {
    BadRequestException,
    ForbiddenException,
    NotFoundException,
} from '@nestjs/common';

describe('ReviewsService', () => {
    let service: ReviewsService;
    let vinylsService: VinylsService;

    const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn(),
    };

    const mockReviewRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
        createQueryBuilder: jest.fn(() => mockQueryBuilder),
    };

    const mockVinylsService = {
        findOne: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                ReviewsService,
                {
                    provide: getRepositoryToken(Review),
                    useValue: mockReviewRepository,
                },
                {
                    provide: VinylsService,
                    useValue: mockVinylsService,
                },
            ],
        }).compile();

        service = module.get<ReviewsService>(ReviewsService);
        vinylsService = module.get<VinylsService>(VinylsService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('create', () => {
        it('should create a review successfully', async () => {
            const userId = 'user-123';
            const createReviewDto = {
                vinylId: 'vinyl-456',
                comment: 'Great album!',
                score: 9,
            };

            const mockVinyl = {
                id: 'vinyl-456',
                name: 'Test Album',
            };

            const mockReview = {
                id: 'review-789',
                userId,
                vinylId: createReviewDto.vinylId,
                comment: createReviewDto.comment,
                score: createReviewDto.score,
                isDeleted: false,
                createdAt: new Date(),
            };

            mockVinylsService.findOne.mockResolvedValue(mockVinyl);
            mockReviewRepository.findOne.mockResolvedValue(null);
            mockReviewRepository.create.mockReturnValue(mockReview);
            mockReviewRepository.save.mockResolvedValue(mockReview);

            const result = await service.create(userId, createReviewDto);

            expect(vinylsService.findOne).toHaveBeenCalledWith(
                createReviewDto.vinylId
            );
            expect(mockReviewRepository.findOne).toHaveBeenCalledWith({
                where: {
                    userId,
                    vinylId: createReviewDto.vinylId,
                    isDeleted: false,
                },
            });
            expect(mockReviewRepository.create).toHaveBeenCalledWith({
                userId,
                vinylId: createReviewDto.vinylId,
                comment: createReviewDto.comment,
                score: createReviewDto.score,
            });
            expect(result).toEqual(mockReview);
        });

        it('should throw BadRequestException if user already reviewed this vinyl', async () => {
            const userId = 'user-123';
            const createReviewDto = {
                vinylId: 'vinyl-456',
                comment: 'Great album!',
                score: 9,
            };

            const mockVinyl = { id: 'vinyl-456' };
            const existingReview = {
                id: 'review-existing',
                userId,
                vinylId: createReviewDto.vinylId,
            };

            mockVinylsService.findOne.mockResolvedValue(mockVinyl);
            mockReviewRepository.findOne.mockResolvedValue(existingReview);

            await expect(
                service.create(userId, createReviewDto)
            ).rejects.toThrow(BadRequestException);
            await expect(
                service.create(userId, createReviewDto)
            ).rejects.toThrow('You have already reviewed this vinyl');
        });
    });

    describe('findAll', () => {
        it('should return paginated reviews', async () => {
            const query = {
                page: 1,
                limit: 20,
                vinylId: 'vinyl-123',
            };

            const mockReviews = [
                {
                    id: 'review-1',
                    comment: 'Great!',
                    score: 9,
                    user: { id: 'user-1', firstName: 'John' },
                },
                {
                    id: 'review-2',
                    comment: 'Amazing!',
                    score: 10,
                    user: { id: 'user-2', firstName: 'Jane' },
                },
            ];

            mockQueryBuilder.getManyAndCount.mockResolvedValue([
                mockReviews,
                2,
            ]);

            const result = await service.findAll(query);

            expect(mockReviewRepository.createQueryBuilder).toHaveBeenCalledWith(
                'review'
            );
            expect(mockQueryBuilder.leftJoinAndSelect).toHaveBeenCalledWith(
                'review.user',
                'user'
            );
            expect(mockQueryBuilder.where).toHaveBeenCalledWith(
                'review.isDeleted = :isDeleted',
                { isDeleted: false }
            );
            expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
                'review.vinylId = :vinylId',
                { vinylId: query.vinylId }
            );
            expect(result).toEqual({
                data: mockReviews,
                total: 2,
                page: 1,
                limit: 20,
                totalPages: 1,
            });
        });
    });

    describe('findOne', () => {
        it('should return a review by id', async () => {
            const reviewId = 'review-123';
            const mockReview = {
                id: reviewId,
                comment: 'Great album!',
                score: 9,
                user: { id: 'user-1', firstName: 'John' },
                vinyl: { id: 'vinyl-1', name: 'Test Album' },
            };

            mockReviewRepository.findOne.mockResolvedValue(mockReview);

            const result = await service.findOne(reviewId);

            expect(mockReviewRepository.findOne).toHaveBeenCalledWith({
                where: { id: reviewId, isDeleted: false },
                relations: ['user', 'vinyl'],
            });
            expect(result).toEqual(mockReview);
        });

        it('should throw NotFoundException when review not found', async () => {
            const reviewId = 'nonexistent-review';
            mockReviewRepository.findOne.mockResolvedValue(null);

            await expect(service.findOne(reviewId)).rejects.toThrow(
                NotFoundException
            );
            await expect(service.findOne(reviewId)).rejects.toThrow(
                'Review not found'
            );
        });
    });

    describe('remove', () => {
        it('should allow user to delete their own review', async () => {
            const reviewId = 'review-123';
            const userId = 'user-123';
            const isAdmin = false;

            const mockReview = {
                id: reviewId,
                userId,
                comment: 'Great album!',
                isDeleted: false,
            };

            mockReviewRepository.findOne.mockResolvedValue(mockReview);
            mockReviewRepository.save.mockResolvedValue({
                ...mockReview,
                isDeleted: true,
            });

            await service.remove(reviewId, userId, isAdmin);

            expect(mockReviewRepository.findOne).toHaveBeenCalledWith({
                where: { id: reviewId, isDeleted: false },
            });
            expect(mockReviewRepository.save).toHaveBeenCalledWith({
                ...mockReview,
                isDeleted: true,
            });
        });

        it('should allow admin to delete any review', async () => {
            const reviewId = 'review-123';
            const userId = 'admin-999';
            const isAdmin = true;

            const mockReview = {
                id: reviewId,
                userId: 'user-123',
                comment: 'Some review',
                isDeleted: false,
            };

            mockReviewRepository.findOne.mockResolvedValue(mockReview);
            mockReviewRepository.save.mockResolvedValue({
                ...mockReview,
                isDeleted: true,
            });

            await service.remove(reviewId, userId, isAdmin);

            expect(mockReviewRepository.save).toHaveBeenCalled();
        });

        it('should throw ForbiddenException when non-owner tries to delete', async () => {
            const reviewId = 'review-123';
            const userId = 'user-999';
            const isAdmin = false;

            const mockReview = {
                id: reviewId,
                userId: 'user-123',
                isDeleted: false,
            };

            mockReviewRepository.findOne.mockResolvedValue(mockReview);

            await expect(
                service.remove(reviewId, userId, isAdmin)
            ).rejects.toThrow(ForbiddenException);
            await expect(
                service.remove(reviewId, userId, isAdmin)
            ).rejects.toThrow('You can only delete your own reviews');
        });

        it('should throw NotFoundException when review does not exist', async () => {
            const reviewId = 'nonexistent-review';
            const userId = 'user-123';
            const isAdmin = false;

            mockReviewRepository.findOne.mockResolvedValue(null);

            await expect(
                service.remove(reviewId, userId, isAdmin)
            ).rejects.toThrow(NotFoundException);
        });
    });
});