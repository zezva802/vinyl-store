import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { OrderItem } from './entities/order-item.entity';
import { VinylsService } from '../vinyls/vinyls.service';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OrdersService', () => {
    let service: OrdersService;
    let vinylsService: VinylsService;

    const mockOrderRepository = {
        create: jest.fn(),
        save: jest.fn(),
        find: jest.fn(),
        findOne: jest.fn(),
        remove: jest.fn(),
    };

    const mockOrderItemRepository = {
        create: jest.fn(),
        save: jest.fn(),
        remove: jest.fn(),
    };

    const mockVinylsService = {
        findOne: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn((key: string) => {
            if (key === 'STRIPE_SECRET_KEY') return 'sk_test_mock_key';
            if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_mock_secret';
            return null;
        }),
    };

    const mockStripePaymentIntents = {
        create: jest.fn(),
    };

    beforeEach(async () => {
        jest.clearAllMocks();

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                OrdersService,
                {
                    provide: getRepositoryToken(Order),
                    useValue: mockOrderRepository,
                },
                {
                    provide: getRepositoryToken(OrderItem),
                    useValue: mockOrderItemRepository,
                },
                {
                    provide: VinylsService,
                    useValue: mockVinylsService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<OrdersService>(OrdersService);
        vinylsService = module.get<VinylsService>(VinylsService);

        Object.defineProperty(service, 'stripe', {
            value: {
                paymentIntents: mockStripePaymentIntents,
            },
            writable: true,
        });
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('createPaymentIntent', () => {
        it('should create order and payment intent successfully', async () => {
            const userId = 'user-123';
            const vinylId = 'vinyl-456';
            const createPaymentIntentDto = { vinylId };

            const mockVinyl = {
                id: vinylId,
                name: 'Dark Side of the Moon',
                authorName: 'Pink Floyd',
                price: 29.99,
                description: 'Classic album',
                imageUrl: 'https://example.com/image.jpg',
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                reviews: [],
                orderItems: [],
            };

            const mockOrder = {
                id: 'order-789',
                userId,
                status: OrderStatus.PENDING,
                totalAmount: 29.99,
                stripePaymentIntentId: '',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const mockOrderItem = {
                id: 'item-001',
                orderId: 'order-789',
                vinylId,
                quantity: 1,
                priceAtPurchase: 29.99,
            };

            const mockPaymentIntent = {
                id: 'pi_mock_123',
                client_secret: 'pi_mock_123_secret_456',
                amount: 2999,
                currency: 'usd',
                status: 'requires_payment_method',
            };

            mockVinylsService.findOne.mockResolvedValue(mockVinyl);
            mockOrderRepository.create.mockReturnValue(mockOrder);
            mockOrderRepository.save.mockResolvedValue({
                ...mockOrder,
                stripePaymentIntentId: mockPaymentIntent.id,
            });
            mockOrderItemRepository.create.mockReturnValue(mockOrderItem);
            mockOrderItemRepository.save.mockResolvedValue(mockOrderItem);
            mockStripePaymentIntents.create.mockResolvedValue(
                mockPaymentIntent
            );

            const result = await service.createPaymentIntent(
                userId,
                createPaymentIntentDto
            );

            expect(vinylsService.findOne).toHaveBeenCalledWith(vinylId);
            expect(mockStripePaymentIntents.create).toHaveBeenCalledWith({
                amount: 2999,
                currency: 'usd',
                metadata: {
                    orderId: mockOrder.id,
                    userId,
                    vinylId,
                    vinylName: mockVinyl.name,
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });
            expect(mockOrderRepository.save).toHaveBeenCalled();
            expect(mockOrderItemRepository.save).toHaveBeenCalled();
            expect(result).toEqual({
                clientSecret: mockPaymentIntent.client_secret,
                orderId: mockOrder.id,
                amount: 2999,
            });
        });

        it('should handle Stripe API errors and cleanup', async () => {
            const userId = 'user-123';
            const createPaymentIntentDto = { vinylId: 'vinyl-456' };

            const mockVinyl = {
                id: 'vinyl-456',
                name: 'Test Vinyl',
                price: 29.99,
                authorName: 'Test Artist',
                description: 'Test description',
                imageUrl: 'https://example.com/test.jpg',
                isDeleted: false,
                createdAt: new Date(),
                updatedAt: new Date(),
                reviews: [],
                orderItems: [],
            };

            const mockOrder = {
                id: 'order-789',
                userId,
                status: OrderStatus.PENDING,
                totalAmount: 29.99,
                stripePaymentIntentId: '',
            };

            const mockOrderItem = {
                id: 'item-001',
                orderId: 'order-789',
                vinylId: 'vinyl-456',
                quantity: 1,
                priceAtPurchase: 29.99,
            };

            mockVinylsService.findOne.mockResolvedValue(mockVinyl);
            mockOrderRepository.create.mockReturnValue(mockOrder);
            mockOrderRepository.save.mockResolvedValue(mockOrder);
            mockOrderItemRepository.create.mockReturnValue(mockOrderItem);
            mockOrderItemRepository.save.mockResolvedValue(mockOrderItem);

            mockStripePaymentIntents.create.mockRejectedValue(
                new Error('Stripe API Error')
            );

            await expect(
                service.createPaymentIntent(userId, createPaymentIntentDto)
            ).rejects.toThrow(BadRequestException);

            expect(mockOrderRepository.remove).toHaveBeenCalledWith(mockOrder);
            expect(mockOrderItemRepository.remove).toHaveBeenCalledWith(
                mockOrderItem
            );
        });
    });

    describe('getUserOrders', () => {
        it('should return user orders with relations', async () => {
            const userId = 'user-123';
            const mockOrders = [
                {
                    id: 'order-1',
                    userId,
                    status: OrderStatus.COMPLETED,
                    totalAmount: 29.99,
                    items: [
                        {
                            id: 'item-1',
                            vinyl: {
                                id: 'vinyl-1',
                                name: 'Abbey Road',
                            },
                        },
                    ],
                },
                {
                    id: 'order-2',
                    userId,
                    status: OrderStatus.PENDING,
                    totalAmount: 39.99,
                    items: [],
                },
            ];

            mockOrderRepository.find.mockResolvedValue(mockOrders);

            const result = await service.getUserOrders(userId);

            expect(mockOrderRepository.find).toHaveBeenCalledWith({
                where: { userId },
                relations: ['items', 'items.vinyl'],
                order: { createdAt: 'DESC' },
            });
            expect(result).toEqual(mockOrders);
        });
    });

    describe('getOrder', () => {
        it('should return a specific order for user', async () => {
            const orderId = 'order-123';
            const userId = 'user-456';
            const mockOrder = {
                id: orderId,
                userId,
                status: OrderStatus.COMPLETED,
                totalAmount: 29.99,
                items: [],
            };

            mockOrderRepository.findOne.mockResolvedValue(mockOrder);

            const result = await service.getOrder(orderId, userId);

            expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
                where: { id: orderId, userId },
                relations: ['items', 'items.vinyl'],
            });
            expect(result).toEqual(mockOrder);
        });

        it('should throw NotFoundException when order not found', async () => {
            const orderId = 'nonexistent-order';
            const userId = 'user-456';

            mockOrderRepository.findOne.mockResolvedValue(null);

            await expect(service.getOrder(orderId, userId)).rejects.toThrow(
                NotFoundException
            );
            await expect(service.getOrder(orderId, userId)).rejects.toThrow(
                'Order not found'
            );
        });
    });

    describe('handleWebhook', () => {
        const mockStripeWebhooks = {
            constructEvent: jest.fn(),
        };

        beforeEach(() => {
            Object.defineProperty(service, 'stripe', {
                value: {
                    paymentIntents: mockStripePaymentIntents,
                    webhooks: mockStripeWebhooks,
                },
                writable: true,
            });
        });

        it('should handle payment_intent.succeeded event', async () => {
            const signature = 'test-signature';
            const rawBody = Buffer.from('test-body');

            const mockEvent = {
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: 'pi_test_123',
                        status: 'succeeded',
                    },
                },
            };

            const mockOrder = {
                id: 'order-123',
                stripePaymentIntentId: 'pi_test_123',
                status: OrderStatus.PENDING,
            };

            mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);
            mockOrderRepository.findOne.mockResolvedValue(mockOrder);
            mockOrderRepository.save.mockResolvedValue({
                ...mockOrder,
                status: OrderStatus.COMPLETED,
            });

            await service.handleWebhook(signature, rawBody);

            expect(mockStripeWebhooks.constructEvent).toHaveBeenCalledWith(
                rawBody,
                signature,
                'whsec_mock_secret'
            );
            expect(mockOrderRepository.findOne).toHaveBeenCalledWith({
                where: { stripePaymentIntentId: 'pi_test_123' },
            });
            expect(mockOrderRepository.save).toHaveBeenCalledWith({
                ...mockOrder,
                status: OrderStatus.COMPLETED,
            });
        });

        it('should handle payment_intent.payment_failed event', async () => {
            const signature = 'test-signature';
            const rawBody = Buffer.from('test-body');

            const mockEvent = {
                type: 'payment_intent.payment_failed',
                data: {
                    object: {
                        id: 'pi_test_456',
                        status: 'failed',
                    },
                },
            };

            const mockOrder = {
                id: 'order-456',
                stripePaymentIntentId: 'pi_test_456',
                status: OrderStatus.PENDING,
            };

            mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);
            mockOrderRepository.findOne.mockResolvedValue(mockOrder);
            mockOrderRepository.save.mockResolvedValue({
                ...mockOrder,
                status: OrderStatus.FAILED,
            });

            await service.handleWebhook(signature, rawBody);

            expect(mockOrderRepository.save).toHaveBeenCalledWith({
                ...mockOrder,
                status: OrderStatus.FAILED,
            });
        });

        it('should handle order not found in webhook', async () => {
            const signature = 'test-signature';
            const rawBody = Buffer.from('test-body');

            const mockEvent = {
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: 'pi_nonexistent',
                    },
                },
            };

            mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);
            mockOrderRepository.findOne.mockResolvedValue(null);

            const consoleErrorSpy = jest
                .spyOn(console, 'error')
                .mockImplementation();

            await service.handleWebhook(signature, rawBody);

            expect(consoleErrorSpy).toHaveBeenCalledWith(
                'Order not found for payment intent: pi_nonexistent'
            );
            expect(mockOrderRepository.save).not.toHaveBeenCalled();

            consoleErrorSpy.mockRestore();
        });

        it('should handle ignored event types silently', async () => {
            const signature = 'test-signature';
            const rawBody = Buffer.from('test-body');

            const mockEvent = {
                type: 'charge.succeeded',
                data: { object: {} },
            };

            mockStripeWebhooks.constructEvent.mockReturnValue(mockEvent);

            await service.handleWebhook(signature, rawBody);

            expect(mockOrderRepository.findOne).not.toHaveBeenCalled();
        });

        it('should throw BadRequestException on invalid signature', async () => {
            const signature = 'invalid-signature';
            const rawBody = Buffer.from('test-body');

            mockStripeWebhooks.constructEvent.mockImplementation(() => {
                throw new Error('Invalid signature');
            });

            await expect(
                service.handleWebhook(signature, rawBody)
            ).rejects.toThrow(BadRequestException);
            await expect(
                service.handleWebhook(signature, rawBody)
            ).rejects.toThrow('Webhook signature verification failed');
        });

        it('should throw Error when webhook secret not configured', async () => {
            const signature = 'test-signature';
            const rawBody = Buffer.from('test-body');

            mockConfigService.get.mockReturnValue(null);

            await expect(
                service.handleWebhook(signature, rawBody)
            ).rejects.toThrow('STRIPE_WEBHOOK_SECRET is not configured');
        });
    });
});
