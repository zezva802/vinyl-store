import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
const mockAxios = {
    get: mock.fn(),
};
import { DiscogsService } from '../../src/discogs/discogs.service';
import axios from 'axios';



describe('DiscogsService', () => {
    let service: any;
    let configService: any;

    beforeEach(() => {
        configService = {
            get: mock.fn((key: string) => {
                if (key === 'DISCOGS_TOKEN') return 'test-token-123';
                return null;
            }),
        };

        service = new DiscogsService(configService);

        // Replace axios with mock
        (axios as any).get = mockAxios.get;
    });

    describe('constructor', () => {
        it('should throw error if DISCOGS_TOKEN not defined', () => {
            const badConfig = {
                get: mock.fn(() => null),
            };

            assert.throws(
                () => new DiscogsService(badConfig),
                { message: 'DISCOGS_TOKEN is not defined' }
            );
        });

        it('should initialize with token from config', () => {
            

            assert.ok(service);
            assert.strictEqual(configService.get.mock.callCount(), 1);
        });
    });

    describe('searchVinyls', () => {
        it('should search vinyls successfully', async () => {
            const mockResponse = {
                data: {
                    results: [
                        { id: 1, title: 'Album 1', year: '2000' },
                        { id: 2, title: 'Album 2', year: '2001' },
                    ],
                    pagination: {
                        page: 1,
                        pages: 10,
                        items: 200,
                    },
                },
            };

            mockAxios.get.mock.mockImplementation(() => Promise.resolve(mockResponse));

            const result = await service.searchVinyls('Beatles', 1);

            assert.strictEqual(result.results.length, 2);
            assert.strictEqual(result.pagination.page, 1);
            assert.strictEqual(mockAxios.get.mock.callCount(), 1);
        });

        it('should use correct search parameters', async () => {
            const mockResponse = {
                data: { results: [], pagination: { page: 1, pages: 0, items: 0 } },
            };

            mockAxios.get.mock.mockImplementation(() => Promise.resolve(mockResponse));

            await service.searchVinyls('Pink Floyd', 2);

            const getCall = mockAxios.get.mock.calls[0].arguments;
            assert.ok(getCall[0].includes('/database/search'));
            assert.strictEqual(getCall[1].params.q, 'Pink Floyd');
            assert.strictEqual(getCall[1].params.page, 2);
            assert.strictEqual(getCall[1].params.type, 'release');
            assert.strictEqual(getCall[1].params.format, 'vinyl');
            assert.strictEqual(getCall[1].params.per_page, 20);
        });

        it('should include authorization headers', async () => {
            const mockResponse = {
                data: { results: [], pagination: { page: 1, pages: 0, items: 0 } },
            };

            mockAxios.get.mock.mockImplementation(() => Promise.resolve(mockResponse));

            await service.searchVinyls('test', 1);

            const getCall = mockAxios.get.mock.calls[0].arguments;
            assert.ok(getCall[1].headers.Authorization.includes('test-token-123'));
            assert.strictEqual(getCall[1].headers['User-Agent'], 'VinylStoreAPI/1.0');
        });

        it('should default to page 1 if not provided', async () => {
            const mockResponse = {
                data: { results: [], pagination: { page: 1, pages: 0, items: 0 } },
            };

            mockAxios.get.mock.mockImplementation(() => Promise.resolve(mockResponse));

            await service.searchVinyls('test');

            const getCall = mockAxios.get.mock.calls[0].arguments;
            assert.strictEqual(getCall[1].params.page, 1);
        });

        it('should throw error on search failure', async () => {
            mockAxios.get.mock.mockImplementation(() => {
                throw new Error('API Error');
            });

            await assert.rejects(
                () => service.searchVinyls('test', 1),
                { message: /Discogs search failed/ }
            );
        });
    });

    describe('getRelease', () => {
        it('should get release by id successfully', async () => {
            const mockRelease = {
                id: 123456,
                title: 'Dark Side of the Moon',
                artists: [{ name: 'Pink Floyd' }],
                year: 1973,
            };

            const mockResponse = {
                data: mockRelease,
            };

            mockAxios.get.mock.mockImplementation(() => Promise.resolve(mockResponse));

            const result = await service.getRelease('123456');

            assert.strictEqual(result.id, 123456);
            assert.strictEqual(result.title, 'Dark Side of the Moon');
            assert.strictEqual(mockAxios.get.mock.callCount(), 1);
        });

        it('should use correct endpoint', async () => {
            const mockResponse = {
                data: { id: 123, title: 'Album' },
            };

            mockAxios.get.mock.mockImplementation(() => Promise.resolve(mockResponse));

            await service.getRelease('123456');

            const getCall = mockAxios.get.mock.calls[0].arguments;
            assert.ok(getCall[0].includes('/releases/123456'));
        });

        it('should include authorization headers', async () => {
            const mockResponse = {
                data: { id: 123, title: 'Album' },
            };

            mockAxios.get.mock.mockImplementation(() => Promise.resolve(mockResponse));

            await service.getRelease('123456');

            const getCall = mockAxios.get.mock.calls[0].arguments;
            assert.ok(getCall[1].headers.Authorization.includes('test-token-123'));
        });

        it('should throw error on fetch failure', async () => {
            mockAxios.get.mock.mockImplementation(() => {
                throw new Error('Not Found');
            });

            await assert.rejects(
                () => service.getRelease('invalid-id'),
                { message: /Failed to fetch Discogs release/ }
            );
        });
    });

    describe('formatReleaseForVinyl', () => {
        it('should format release with all fields', () => {
            const release = {
                id: 123456,
                title: 'Thriller',
                artists: [{ name: 'Michael Jackson' }],
                year: 1982,
                notes: 'Best-selling album of all time',
                images: [{ uri: 'https://example.com/image.jpg' }],
                community: {
                    rating: {
                        average: 4.5,
                    },
                },
            };

            const result = service.formatReleaseForVinyl(release);

            assert.strictEqual(result.name, 'Thriller');
            assert.strictEqual(result.authorName, 'Michael Jackson');
            assert.strictEqual(result.description, 'Best-selling album of all time');
            assert.strictEqual(result.imageUrl, 'https://example.com/image.jpg');
            assert.strictEqual(result.discogsId, '123456');
            assert.strictEqual(result.discogsScore, 4.5);
        });

        it('should handle multiple artists', () => {
            const release = {
                id: 123,
                title: 'Collaboration Album',
                artists: [
                    { name: 'Artist One' },
                    { name: 'Artist Two' },
                    { name: 'Artist Three' },
                ],
                year: 2020,
            };

            const result = service.formatReleaseForVinyl(release);

            assert.strictEqual(result.authorName, 'Artist One, Artist Two, Artist Three');
        });

        it('should use default description when notes missing', () => {
            const release = {
                id: 123,
                title: 'Test Album',
                artists: [{ name: 'Test Artist' }],
                year: 2000,
            };

            const result = service.formatReleaseForVinyl(release);

            assert.strictEqual(result.description, 'Test Artist - Test Album (2000)');
        });

        it('should handle missing images', () => {
            const release = {
                id: 123,
                title: 'Album',
                artists: [{ name: 'Artist' }],
                year: 2000,
            };

            const result = service.formatReleaseForVinyl(release);

            assert.strictEqual(result.imageUrl, null);
        });

        it('should handle empty images array', () => {
            const release = {
                id: 123,
                title: 'Album',
                artists: [{ name: 'Artist' }],
                year: 2000,
                images: [],
            };

            const result = service.formatReleaseForVinyl(release);

            assert.strictEqual(result.imageUrl, null);
        });

        it('should handle missing community rating', () => {
            const release = {
                id: 123,
                title: 'Album',
                artists: [{ name: 'Artist' }],
                year: 2000,
            };

            const result = service.formatReleaseForVinyl(release);

            assert.strictEqual(result.discogsScore, null);
        });

        it('should handle empty artists array', () => {
            const release = {
                id: 123,
                title: 'Album',
                artists: [],
                year: 2000,
            };

            const result = service.formatReleaseForVinyl(release);

            assert.strictEqual(result.authorName, 'Unknown Artist');
        });

        it('should convert numeric id to string', () => {
            const release = {
                id: 999888,
                title: 'Album',
                artists: [{ name: 'Artist' }],
                year: 2000,
            };

            const result = service.formatReleaseForVinyl(release);

            assert.strictEqual(result.discogsId, '999888');
            assert.strictEqual(typeof result.discogsId, 'string');
        });

        it('should use first image when multiple images present', () => {
            const release = {
                id: 123,
                title: 'Album',
                artists: [{ name: 'Artist' }],
                year: 2000,
                images: [
                    { uri: 'https://example.com/first.jpg' },
                    { uri: 'https://example.com/second.jpg' },
                ],
            };

            const result = service.formatReleaseForVinyl(release);

            assert.strictEqual(result.imageUrl, 'https://example.com/first.jpg');
        });
    });
});