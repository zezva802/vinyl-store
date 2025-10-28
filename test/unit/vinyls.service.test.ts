import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { VinylsService } from '../../src/vinyls/vinyls.service';

describe('VinylsService', () => {
    let service: any;
    let repository: any;
    let discogsService: any;

    beforeEach(() => {
        repository = {
            findOne: mock.fn(),
            create: mock.fn(),
            save: mock.fn(),
            createQueryBuilder: mock.fn(),
        };

        discogsService = {
            getRelease: mock.fn(),
            formatReleaseForVinyl: mock.fn(),
        };

        service = new VinylsService(repository, discogsService);
    });

    describe('create', () => {
        it('should create a vinyl', async () => {
            const dto = {
                name: 'Dark Side of the Moon',
                authorName: 'Pink Floyd',
                description: 'Classic album',
                price: 29.99,
            };

            repository.create.mock.mockImplementation((data: any) => data);
            repository.save.mock.mockImplementation((vinyl: any) => Promise.resolve(vinyl));

            const result = await service.create(dto);

            assert.strictEqual(repository.create.mock.callCount(), 1);
            assert.strictEqual(repository.save.mock.callCount(), 1);
            assert.ok(result);
        });
    });

    describe('findAll', () => {
        it('should return paginated vinyls', async () => {
            const mockVinyls = [
                { id: '1', name: 'Album 1', reviews: [] },
                { id: '2', name: 'Album 2', reviews: [] },
            ];

            const queryBuilder = {
                leftJoinAndSelect: mock.fn(function() { return this; }),
                where: mock.fn(function() { return this; }),
                andWhere: mock.fn(function() { return this; }),
                orderBy: mock.fn(function() { return this; }),
                skip: mock.fn(function() { return this; }),
                take: mock.fn(function() { return this; }),
                getManyAndCount: mock.fn(() => Promise.resolve([mockVinyls, 2])),
            };

            repository.createQueryBuilder.mock.mockImplementation(() => queryBuilder);

            const result = await service.findAll({});

            assert.strictEqual(result.data.length, 2);
            assert.strictEqual(result.total, 2);
            assert.strictEqual(result.page, 1);
            assert.strictEqual(result.limit, 20);
        });

        it('should filter by search', async () => {
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

            await service.findAll({ search: 'Beatles' });

            assert.ok(queryBuilder.andWhere.mock.callCount() > 0);
        });

        it('should calculate average score', async () => {
            const mockVinyls = [{
                id: '1',
                name: 'Album',
                reviews: [
                    { score: 8, isDeleted: false, userId: 'u1', user: { firstName: 'John', lastName: 'Doe' } },
                    { score: 10, isDeleted: false, userId: 'u2', user: { firstName: 'Jane', lastName: 'Doe' } },
                ]
            }];

            const queryBuilder = {
                leftJoinAndSelect: mock.fn(function() { return this; }),
                where: mock.fn(function() { return this; }),
                andWhere: mock.fn(function() { return this; }),
                orderBy: mock.fn(function() { return this; }),
                skip: mock.fn(function() { return this; }),
                take: mock.fn(function() { return this; }),
                getManyAndCount: mock.fn(() => Promise.resolve([mockVinyls, 1])),
            };

            repository.createQueryBuilder.mock.mockImplementation(() => queryBuilder);

            const result = await service.findAll({});

            assert.strictEqual(result.data[0].averageScore, 9);
        });

        it('should exclude current user reviews from firstReview', async () => {
            const currentUserId = 'user-1';
            const mockVinyls = [{
                id: '1',
                name: 'Album',
                reviews: [
                    { id: 'r1', score: 8, isDeleted: false, userId: currentUserId, comment: 'My review', user: { firstName: 'Me', lastName: 'User' }, createdAt: new Date() },
                    { id: 'r2', score: 10, isDeleted: false, userId: 'user-2', comment: 'Other review', user: { firstName: 'Other', lastName: 'User' }, createdAt: new Date() },
                ]
            }];

            const queryBuilder = {
                leftJoinAndSelect: mock.fn(function() { return this; }),
                where: mock.fn(function() { return this; }),
                andWhere: mock.fn(function() { return this; }),
                orderBy: mock.fn(function() { return this; }),
                skip: mock.fn(function() { return this; }),
                take: mock.fn(function() { return this; }),
                getManyAndCount: mock.fn(() => Promise.resolve([mockVinyls, 1])),
            };

            repository.createQueryBuilder.mock.mockImplementation(() => queryBuilder);

            const result = await service.findAll({}, currentUserId);

            assert.strictEqual(result.data[0].firstReview?.comment, 'Other review');
        });

        it('should return 0 average when no reviews', async () => {
            const mockVinyls = [{ id: '1', name: 'Album', reviews: [] }];

            const queryBuilder = {
                leftJoinAndSelect: mock.fn(function() { return this; }),
                where: mock.fn(function() { return this; }),
                andWhere: mock.fn(function() { return this; }),
                orderBy: mock.fn(function() { return this; }),
                skip: mock.fn(function() { return this; }),
                take: mock.fn(function() { return this; }),
                getManyAndCount: mock.fn(() => Promise.resolve([mockVinyls, 1])),
            };

            repository.createQueryBuilder.mock.mockImplementation(() => queryBuilder);

            const result = await service.findAll({});

            assert.strictEqual(result.data[0].averageScore, 0);
            assert.strictEqual(result.data[0].firstReview, null);
        });
    });

    describe('findOne', () => {
        it('should find vinyl by id', async () => {
            const mockVinyl = { id: 'vinyl-1', name: 'Album' };
            repository.findOne.mock.mockImplementation(() => Promise.resolve(mockVinyl));

            const result = await service.findOne('vinyl-1');

            assert.strictEqual(result.id, 'vinyl-1');
        });

        it('should throw NotFoundException when not found', async () => {
            repository.findOne.mock.mockImplementation(() => Promise.resolve(null));

            await assert.rejects(
                () => service.findOne('not-exist'),
                { name: 'NotFoundException' }
            );
        });
    });

    describe('update', () => {
        it('should update vinyl', async () => {
            const existing = { id: 'vinyl-1', name: 'Old', price: 19.99 };
            const updated = { id: 'vinyl-1', name: 'New', price: 24.99 };

            repository.findOne.mock.mockImplementation(() => Promise.resolve(existing));
            repository.save.mock.mockImplementation((v: any) => Promise.resolve(v));
            repository.findOne.mock.mockImplementation(() => Promise.resolve(updated));

            const result = await service.update('vinyl-1', { name: 'New', price: 24.99 });

            assert.strictEqual(repository.save.mock.callCount(), 1);
            assert.ok(result);
        });

        it('should throw NotFoundException when not found', async () => {
            repository.findOne.mock.mockImplementation(() => Promise.resolve(null));

            await assert.rejects(
                () => service.update('not-exist', { name: 'Test' }),
                { name: 'NotFoundException' }
            );
        });
    });

    describe('remove', () => {
        it('should soft delete vinyl', async () => {
            const vinyl = { id: 'vinyl-1', isDeleted: false };
            repository.findOne.mock.mockImplementation(() => Promise.resolve(vinyl));
            repository.save.mock.mockImplementation((v: any) => Promise.resolve(v));

            await service.remove('vinyl-1');

            assert.strictEqual(repository.save.mock.callCount(), 1);
            const saved = repository.save.mock.calls[0].arguments[0];
            assert.strictEqual(saved.isDeleted, true);
        });

        it('should throw NotFoundException when not found', async () => {
            repository.findOne.mock.mockImplementation(() => Promise.resolve(null));

            await assert.rejects(
                () => service.remove('not-exist'),
                { name: 'NotFoundException' }
            );
        });
    });

    describe('findOneWithAverageScore', () => {
        it('should return vinyl with average score', async () => {
            const vinyl = {
                id: 'vinyl-1',
                name: 'Album',
                reviews: [
                    { score: 7, isDeleted: false },
                    { score: 9, isDeleted: false },
                ]
            };

            repository.findOne.mock.mockImplementation(() => Promise.resolve(vinyl));

            const result = await service.findOneWithAverageScore('vinyl-1');

            assert.strictEqual(result.averageScore, 8);
        });

        it('should exclude deleted reviews', async () => {
            const vinyl = {
                id: 'vinyl-1',
                name: 'Album',
                reviews: [
                    { score: 10, isDeleted: false },
                    { score: 2, isDeleted: true },
                    { score: 8, isDeleted: false },
                ]
            };

            repository.findOne.mock.mockImplementation(() => Promise.resolve(vinyl));

            const result = await service.findOneWithAverageScore('vinyl-1');

            assert.strictEqual(result.averageScore, 9);
        });

        it('should return 0 when no reviews', async () => {
            const vinyl = { id: 'vinyl-1', name: 'Album', reviews: [] };
            repository.findOne.mock.mockImplementation(() => Promise.resolve(vinyl));

            const result = await service.findOneWithAverageScore('vinyl-1');

            assert.strictEqual(result.averageScore, 0);
        });
    });

    describe('createFromDiscogs', () => {
        it('should create vinyl from Discogs', async () => {
            const discogsId = '123456';
            const price = 34.99;

            const release = {
                id: 123456,
                title: 'Thriller',
                artists: [{ name: 'Michael Jackson' }],
            };

            const formatted = {
                name: 'Thriller',
                authorName: 'Michael Jackson',
                description: 'Best album',
                imageUrl: 'image.jpg',
                discogsId: '123456',
                discogsScore: 4.5,
            };

            repository.findOne.mock.mockImplementation(() => Promise.resolve(null));
            discogsService.getRelease.mock.mockImplementation(() => Promise.resolve(release));
            discogsService.formatReleaseForVinyl.mock.mockImplementation(() => formatted);
            repository.create.mock.mockImplementation((data: any) => data);
            repository.save.mock.mockImplementation((v: any) => Promise.resolve(v));

            const result = await service.createFromDiscogs(discogsId, price);

            assert.strictEqual(discogsService.getRelease.mock.callCount(), 1);
            assert.strictEqual(repository.save.mock.callCount(), 1);
            assert.ok(result);
        });

        it('should throw BadRequestException if already exists', async () => {
            const existing = { id: 'vinyl-1', discogsId: '123456' };
            repository.findOne.mock.mockImplementation(() => Promise.resolve(existing));

            await assert.rejects(
                () => service.createFromDiscogs('123456', 29.99),
                { name: 'BadRequestException' }
            );

            assert.strictEqual(discogsService.getRelease.mock.callCount(), 0);
        });
    });
});