import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { ReviewsService } from '../../src/reviews/reviews.service';

describe('ReviewsService', () => {
    let service: any;
    let repository: any;
    let vinylsService: any;

    beforeEach(() => {
        repository = {
            findOne: mock.fn(),
            create: mock.fn(),
            save: mock.fn(),
            createQueryBuilder: mock.fn(),
        };

        vinylsService = {
            findOne: mock.fn(),
        };

        service = new ReviewsService(repository, vinylsService);
    });

    describe('create', () => {
        it('should create a review', async () => {
            const userId = 'user-1';
            const dto = {
                vinylId: 'vinyl-1',
                comment: 'Great album!',
                score: 9,
            };

            const mockVinyl = { id: 'vinyl-1', name: 'Album' };
            vinylsService.findOne.mock.mockImplementation(() => Promise.resolve(mockVinyl));
            repository.findOne.mock.mockImplementation(() => Promise.resolve(null));
            repository.create.mock.mockImplementation((data: any) => data);
            repository.save.mock.mockImplementation((review: any) => Promise.resolve(review));

            const result = await service.create(userId, dto);

            assert.strictEqual(vinylsService.findOne.mock.callCount(), 1);
            assert.strictEqual(repository.create.mock.callCount(), 1);
            assert.strictEqual(repository.save.mock.callCount(), 1);
            assert.ok(result);
        });

        it('should throw BadRequestException if user already reviewed', async () => {
            const userId = 'user-1';
            const dto = {
                vinylId: 'vinyl-1',
                comment: 'Great album!',
                score: 9,
            };

            const mockVinyl = { id: 'vinyl-1', name: 'Album' };
            const existingReview = { id: 'review-1', userId, vinylId: 'vinyl-1' };

            vinylsService.findOne.mock.mockImplementation(() => Promise.resolve(mockVinyl));
            repository.findOne.mock.mockImplementation(() => Promise.resolve(existingReview));

            await assert.rejects(
                () => service.create(userId, dto),
                { name: 'BadRequestException', message: 'You have already reviewed this vinyl' }
            );

            assert.strictEqual(repository.create.mock.callCount(), 0);
        });

        it('should throw NotFoundException if vinyl does not exist', async () => {
            const userId = 'user-1';
            const dto = {
                vinylId: 'not-exist',
                comment: 'Great album!',
                score: 9,
            };

            vinylsService.findOne.mock.mockImplementation(() => {
                throw { name: 'NotFoundException', message: 'Vinyl not found' };
            });

            await assert.rejects(
                () => service.create(userId, dto),
                { name: 'NotFoundException' }
            );
        });
    });

    describe('findAll', () => {
        it('should return paginated reviews', async () => {
            const mockReviews = [
                { id: 'review-1', comment: 'Great!', score: 9 },
                { id: 'review-2', comment: 'Good!', score: 8 },
            ];

            const queryBuilder = {
                leftJoinAndSelect: mock.fn(function() { return this; }),
                where: mock.fn(function() { return this; }),
                andWhere: mock.fn(function() { return this; }),
                orderBy: mock.fn(function() { return this; }),
                skip: mock.fn(function() { return this; }),
                take: mock.fn(function() { return this; }),
                getManyAndCount: mock.fn(() => Promise.resolve([mockReviews, 2])),
            };

            repository.createQueryBuilder.mock.mockImplementation(() => queryBuilder);

            const result = await service.findAll({});

            assert.strictEqual(result.data.length, 2);
            assert.strictEqual(result.total, 2);
            assert.strictEqual(result.page, 1);
            assert.strictEqual(result.limit, 20);
            assert.strictEqual(result.totalPages, 1);
        });

        it('should filter by vinylId', async () => {
            const queryBuilder = {
                leftJoinAndSelect: mock.fn(function() { return this; }),
                where: mock.fn(function() { return this; }),
                andWhere: mock.fn(function() { return this; }),
                orderBy: mock.fn(function() { return this; }),
                skip: mock.fn(function() { return this; }),
                take: mock.fn(function() { return this; }),
                getManyAndCount: mock.fn(() => Promise.resolve([[], 0])),
            };

            repository.createQueryBuilder.mock.mockImplementation(() => queryBuilder);

            await service.findAll({ vinylId: 'vinyl-123' });

            assert.strictEqual(queryBuilder.andWhere.mock.callCount(), 1);
        });

        it('should apply pagination', async () => {
            const queryBuilder = {
                leftJoinAndSelect: mock.fn(function() { return this; }),
                where: mock.fn(function() { return this; }),
                andWhere: mock.fn(function() { return this; }),
                orderBy: mock.fn(function() { return this; }),
                skip: mock.fn(function() { return this; }),
                take: mock.fn(function() { return this; }),
                getManyAndCount: mock.fn(() => Promise.resolve([[], 0])),
            };

            repository.createQueryBuilder.mock.mockImplementation(() => queryBuilder);

            await service.findAll({ page: 2, limit: 10 });

            assert.strictEqual(queryBuilder.skip.mock.callCount(), 1);
            assert.strictEqual(queryBuilder.take.mock.callCount(), 1);
        });

        it('should order by createdAt DESC', async () => {
            const queryBuilder = {
                leftJoinAndSelect: mock.fn(function() { return this; }),
                where: mock.fn(function() { return this; }),
                andWhere: mock.fn(function() { return this; }),
                orderBy: mock.fn(function() { return this; }),
                skip: mock.fn(function() { return this; }),
                take: mock.fn(function() { return this; }),
                getManyAndCount: mock.fn(() => Promise.resolve([[], 0])),
            };

            repository.createQueryBuilder.mock.mockImplementation(() => queryBuilder);

            await service.findAll({});

            assert.strictEqual(queryBuilder.orderBy.mock.callCount(), 1);
            const orderByCall = queryBuilder.orderBy.mock.calls[0].arguments;
            assert.strictEqual(orderByCall[0], 'review.createdAt');
            assert.strictEqual(orderByCall[1], 'DESC');
        });
    });

    describe('findOne', () => {
        it('should find review by id', async () => {
            const mockReview = { id: 'review-1', comment: 'Great!' };
            repository.findOne.mock.mockImplementation(() => Promise.resolve(mockReview));

            const result = await service.findOne('review-1');

            assert.strictEqual(result.id, 'review-1');
            assert.strictEqual(repository.findOne.mock.callCount(), 1);
        });

        it('should throw NotFoundException when not found', async () => {
            repository.findOne.mock.mockImplementation(() => Promise.resolve(null));

            await assert.rejects(
                () => service.findOne('not-exist'),
                { name: 'NotFoundException', message: 'Review not found' }
            );
        });

        it('should include user and vinyl relations', async () => {
            const mockReview = { 
                id: 'review-1', 
                comment: 'Great!',
                user: { id: 'user-1', firstName: 'John' },
                vinyl: { id: 'vinyl-1', name: 'Album' }
            };
            repository.findOne.mock.mockImplementation(() => Promise.resolve(mockReview));

            await service.findOne('review-1');

            const findOneCall = repository.findOne.mock.calls[0].arguments[0];
            assert.ok(findOneCall.relations.includes('user'));
            assert.ok(findOneCall.relations.includes('vinyl'));
        });
    });

    describe('remove', () => {
        it('should allow user to delete own review', async () => {
            const userId = 'user-1';
            const review = { id: 'review-1', userId: 'user-1', isDeleted: false };

            repository.findOne.mock.mockImplementation(() => Promise.resolve(review));
            repository.save.mock.mockImplementation((r: any) => Promise.resolve(r));

            await service.remove('review-1', userId, false);

            assert.strictEqual(repository.save.mock.callCount(), 1);
            const saved = repository.save.mock.calls[0].arguments[0];
            assert.strictEqual(saved.isDeleted, true);
        });

        it('should allow admin to delete any review', async () => {
            const userId = 'admin-1';
            const review = { id: 'review-1', userId: 'other-user', isDeleted: false };

            repository.findOne.mock.mockImplementation(() => Promise.resolve(review));
            repository.save.mock.mockImplementation((r: any) => Promise.resolve(r));

            await service.remove('review-1', userId, true);

            assert.strictEqual(repository.save.mock.callCount(), 1);
            const saved = repository.save.mock.calls[0].arguments[0];
            assert.strictEqual(saved.isDeleted, true);
        });

        it('should throw ForbiddenException if user tries to delete others review', async () => {
            const userId = 'user-1';
            const review = { id: 'review-1', userId: 'user-2', isDeleted: false };

            repository.findOne.mock.mockImplementation(() => Promise.resolve(review));

            await assert.rejects(
                () => service.remove('review-1', userId, false),
                { name: 'ForbiddenException', message: 'You can only delete your own reviews' }
            );

            assert.strictEqual(repository.save.mock.callCount(), 0);
        });

        it('should throw NotFoundException when review not found', async () => {
            repository.findOne.mock.mockImplementation(() => Promise.resolve(null));

            await assert.rejects(
                () => service.remove('not-exist', 'user-1', false),
                { name: 'NotFoundException', message: 'Review not found' }
            );
        });

        it('should not delete already deleted review', async () => {
            repository.findOne.mock.mockImplementation(() => Promise.resolve(null));

            await assert.rejects(
                () => service.remove('deleted-review', 'user-1', false),
                { name: 'NotFoundException' }
            );
        });
    });
});