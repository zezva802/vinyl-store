import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { TelegramService } from '../../src/telegram/telegram.service';

describe('TelegramService', () => {
    let service: any;
    let configService: any;
    let mockBot: any;

    beforeEach(() => {
        configService = {
            get: mock.fn((key: string) => {
                if (key === 'TELEGRAM_BOT_TOKEN') return 'test-bot-token';
                if (key === 'TELEGRAM_CHANNEL_ID') return '@testchannel';
                if (key === 'FRONTEND_URL') return 'http://localhost:3000';
                return null;
            }),
        };

        mockBot = {
            sendPhoto: mock.fn(),
            sendMessage: mock.fn(),
        };

        service = new TelegramService(configService);
        service.bot = mockBot;
    });

    describe('constructor', () => {
        it('should initialize with all config values', () => {
            const service = new TelegramService(configService);

            assert.ok(service);
            assert.strictEqual(configService.get.mock.callCount() >= 3, true);
        });

        it('should handle missing token gracefully', () => {
            const badConfig = {
                get: mock.fn((key: string) => {
                    if (key === 'TELEGRAM_CHANNEL_ID') return '@testchannel';
                    return null;
                }),
            };

            const service = new TelegramService(badConfig);

            assert.strictEqual(service.isConfigured(), false);
        });

        it('should handle missing channel id gracefully', () => {
            const badConfig = {
                get: mock.fn((key: string) => {
                    if (key === 'TELEGRAM_BOT_TOKEN') return 'test-token';
                    return null;
                }),
            };

            const service = new TelegramService(badConfig);

            assert.strictEqual(service.isConfigured(), false);
        });

        it('should use default frontend url if not provided', () => {
            const configWithoutUrl = {
                get: mock.fn((key: string) => {
                    if (key === 'TELEGRAM_BOT_TOKEN') return 'test-token';
                    if (key === 'TELEGRAM_CHANNEL_ID') return '@testchannel';
                    return null;
                }),
            };

            const service = new TelegramService(configWithoutUrl);
            service.bot = mockBot;

            assert.ok(service);
        });
    });

    describe('postVinylToChannel', () => {
        it('should post vinyl with image', async () => {
            const vinyl = {
                id: 'vinyl-1',
                name: 'Dark Side of the Moon',
                authorName: 'Pink Floyd',
                description: 'Classic progressive rock album',
                price: 29.99,
                imageUrl: 'https://example.com/image.jpg',
                discogsScore: 4.5,
            };

            mockBot.sendPhoto.mock.mockImplementation(() => Promise.resolve());

            const result = await service.postVinylToChannel(vinyl);

            assert.strictEqual(result, true);
            assert.strictEqual(mockBot.sendPhoto.mock.callCount(), 1);
            assert.strictEqual(mockBot.sendMessage.mock.callCount(), 0);
        });

        it('should post vinyl without image', async () => {
            const vinyl = {
                id: 'vinyl-1',
                name: 'Abbey Road',
                authorName: 'The Beatles',
                description: 'Final studio album',
                price: 24.99,
                imageUrl: null,
                discogsScore: null,
            };

            mockBot.sendMessage.mock.mockImplementation(() =>
                Promise.resolve()
            );

            const result = await service.postVinylToChannel(vinyl);

            assert.strictEqual(result, true);
            assert.strictEqual(mockBot.sendMessage.mock.callCount(), 1);
            assert.strictEqual(mockBot.sendPhoto.mock.callCount(), 0);
        });

        it('should include store link in keyboard', async () => {
            const vinyl = {
                id: 'vinyl-123',
                name: 'Test Album',
                authorName: 'Test Artist',
                description: 'Description',
                price: 19.99,
                imageUrl: null,
            };

            mockBot.sendMessage.mock.mockImplementation(() =>
                Promise.resolve()
            );

            await service.postVinylToChannel(vinyl);

            const sendCall = mockBot.sendMessage.mock.calls[0].arguments;
            const keyboard = sendCall[2].reply_markup;

            assert.ok(keyboard.inline_keyboard[0][0].url.includes('vinyl-123'));
        });

        it('should format message with price', async () => {
            const vinyl = {
                id: 'vinyl-1',
                name: 'Test Album',
                authorName: 'Test Artist',
                description: 'Description',
                price: 29.99,
                imageUrl: null,
            };

            mockBot.sendMessage.mock.mockImplementation(() =>
                Promise.resolve()
            );

            await service.postVinylToChannel(vinyl);

            const sendCall = mockBot.sendMessage.mock.calls[0].arguments;
            const message = sendCall[1];

            assert.ok(message.includes('$29.99'));
            assert.ok(message.includes('Test Album'));
            assert.ok(message.includes('Test Artist'));
        });

        it('should include discogs score if available', async () => {
            const vinyl = {
                id: 'vinyl-1',
                name: 'Test Album',
                authorName: 'Test Artist',
                description: 'Description',
                price: 29.99,
                imageUrl: null,
                discogsScore: 4.8,
            };

            mockBot.sendMessage.mock.mockImplementation(() =>
                Promise.resolve()
            );

            await service.postVinylToChannel(vinyl);

            const sendCall = mockBot.sendMessage.mock.calls[0].arguments;
            const message = sendCall[1];

            assert.ok(message.includes('4.8/5.00'));
        });

        it('should omit discogs score if not available', async () => {
            const vinyl = {
                id: 'vinyl-1',
                name: 'Test Album',
                authorName: 'Test Artist',
                description: 'Description',
                price: 29.99,
                imageUrl: null,
                discogsScore: null,
            };

            mockBot.sendMessage.mock.mockImplementation(() =>
                Promise.resolve()
            );

            await service.postVinylToChannel(vinyl);

            const sendCall = mockBot.sendMessage.mock.calls[0].arguments;
            const message = sendCall[1];

            assert.ok(!message.includes('Discogs Score'));
        });

        it('should return false if bot not configured', async () => {
            service.bot = null;

            const vinyl = {
                id: 'vinyl-1',
                name: 'Test',
                authorName: 'Artist',
                description: 'Desc',
                price: 10,
            };

            const result = await service.postVinylToChannel(vinyl);

            assert.strictEqual(result, false);
        });

        it('should return false on telegram error', async () => {
            const vinyl = {
                id: 'vinyl-1',
                name: 'Test',
                authorName: 'Artist',
                description: 'Desc',
                price: 10,
                imageUrl: null,
            };

            mockBot.sendMessage.mock.mockImplementation(() => {
                throw new Error('Telegram API error');
            });

            const result = await service.postVinylToChannel(vinyl);

            assert.strictEqual(result, false);
        });

        it('should use HTML parse mode', async () => {
            const vinyl = {
                id: 'vinyl-1',
                name: 'Test',
                authorName: 'Artist',
                description: 'Desc',
                price: 10,
                imageUrl: null,
            };

            mockBot.sendMessage.mock.mockImplementation(() =>
                Promise.resolve()
            );

            await service.postVinylToChannel(vinyl);

            const sendCall = mockBot.sendMessage.mock.calls[0].arguments;
            assert.strictEqual(sendCall[2].parse_mode, 'HTML');
        });

        it('should include hashtags in message', async () => {
            const vinyl = {
                id: 'vinyl-1',
                name: 'Test Album',
                authorName: 'Pink Floyd',
                description: 'Description',
                price: 29.99,
                imageUrl: null,
            };

            mockBot.sendMessage.mock.mockImplementation(() =>
                Promise.resolve()
            );

            await service.postVinylToChannel(vinyl);

            const sendCall = mockBot.sendMessage.mock.calls[0].arguments;
            const message = sendCall[1];

            assert.ok(message.includes('#NewArrival'));
            assert.ok(message.includes('#PinkFloyd'));
        });
    });

    describe('sendCustomMessage', () => {
        it('should send custom message successfully', async () => {
            const message = 'Hello from the store!';

            mockBot.sendMessage.mock.mockImplementation(() =>
                Promise.resolve()
            );

            const result = await service.sendCustomMessage(message);

            assert.strictEqual(result, true);
            assert.strictEqual(mockBot.sendMessage.mock.callCount(), 1);

            const sendCall = mockBot.sendMessage.mock.calls[0].arguments;
            assert.strictEqual(sendCall[0], '@testchannel');
            assert.strictEqual(sendCall[1], message);
            assert.strictEqual(sendCall[2].parse_mode, 'HTML');
        });

        it('should return false if bot not configured', async () => {
            service.bot = null;

            const result = await service.sendCustomMessage('test');

            assert.strictEqual(result, false);
        });

        it('should return false on error', async () => {
            mockBot.sendMessage.mock.mockImplementation(() => {
                throw new Error('API error');
            });

            const result = await service.sendCustomMessage('test');

            assert.strictEqual(result, false);
        });
    });

    describe('isConfigured', () => {
        it('should return true when bot is configured', () => {
            service.bot = mockBot;

            const result = service.isConfigured();

            assert.strictEqual(result, true);
        });

        it('should return false when bot is not configured', () => {
            service.bot = null;

            const result = service.isConfigured();

            assert.strictEqual(result, false);
        });
    });

    describe('getChannelId', () => {
        it('should return channel id', () => {
            const result = service.getChannelId();

            assert.strictEqual(result, '@testchannel');
        });
    });
});
