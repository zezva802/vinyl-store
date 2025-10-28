import { describe, it, beforeEach, mock } from 'node:test';
import assert from 'node:assert';
import { OrdersService } from '../../src/orders/orders.service';

describe('OrdersService', () => {
    let service: any;
    let orderRepository: any;
    let orderItemRepository: any;
    let vinylsService: any;
    let configService: any;
    let emailService: any;
    let mockStripe: any;

    beforeEach(() => {
        orderRepository = {
            create: mock.fn(),
            save: mock.fn(),
            remove: mock.fn(),
            findOne: mock.fn(),
            find: mock.fn(),
        };

        orderItemRepository = {
            create: mock.fn(),
            save: mock.fn(),
            remove: mock.fn(),
        };

        vinylsService = {
            findOne: mock.fn(),
        };

        configService = {
            get: mock.fn((key: string) => {
                if (key === 'STRIPE_SECRET_KEY') return 'sk_test_123';
                if (key === 'STRIPE_WEBHOOK_SECRET') return 'whsec_test';
                return null;
            }),
        };

        emailService = {
            sendOrderConfirmation: mock.fn(),
            sendPaymentFailure: mock.fn(),
        };

        mockStripe = {
            paymentIntents: {
                create: mock.fn(),
            },
            webhooks: {
                constructEvent: mock.fn(),
            },
        };

        // Mock Stripe constructor
        const StripeConstructor: any = function() {
            return mockStripe;
        };

        service = new OrdersService(
            orderRepository,
            orderItemRepository,
            vinylsService,
            configService,
            emailService
        );

        // Inject mock stripe
        service.stripe = mockStripe;
    });

    describe('createPaymentIntent', () => {
        it('should create payment intent successfully', async () => {
            const userId = 'user-1';
            const dto = { vinylId: 'vinyl-1' };

            const mockVinyl = { id: 'vinyl-1', name: 'Album', price: 29.99 };
            const mockOrder = { id: 'order-1', userId, status: 'PENDING' };
            const mockOrderItem = { id: 'item-1', orderId: 'order-1', vinylId: 'vinyl-1' };
            const mockPaymentIntent = {
                id: 'pi_123',
                client_secret: 'pi_123_secret',
            };

            vinylsService.findOne.mock.mockImplementation(() => Promise.resolve(mockVinyl));
            orderRepository.create.mock.mockImplementation((data: any) => data);
            orderRepository.save.mock.mockImplementation((order: any) => Promise.resolve({ ...order, id: 'order-1' }));
            orderItemRepository.create.mock.mockImplementation((data: any) => data);
            orderItemRepository.save.mock.mockImplementation((item: any) => Promise.resolve(item));
            mockStripe.paymentIntents.create.mock.mockImplementation(() => Promise.resolve(mockPaymentIntent));

            const result = await service.createPaymentIntent(userId, dto);

            assert.strictEqual(result.clientSecret, 'pi_123_secret');
            assert.strictEqual(result.orderId, 'order-1');
            assert.strictEqual(result.amount, 2999); // 29.99 * 100
            assert.strictEqual(vinylsService.findOne.mock.callCount(), 1);
            assert.strictEqual(orderRepository.save.mock.callCount(), 2);
            assert.strictEqual(mockStripe.paymentIntents.create.mock.callCount(), 1);
        });

        it('should throw NotFoundException if vinyl does not exist', async () => {
            vinylsService.findOne.mock.mockImplementation(() => {
                throw { name: 'NotFoundException', message: 'Vinyl not found' };
            });

            await assert.rejects(
                () => service.createPaymentIntent('user-1', { vinylId: 'not-exist' }),
                { name: 'NotFoundException' }
            );
        });

        it('should rollback order if stripe fails', async () => {
            const mockVinyl = { id: 'vinyl-1', name: 'Album', price: 29.99 };
            const mockOrder = { id: 'order-1', userId: 'user-1' };
            const mockOrderItem = { id: 'item-1' };

            vinylsService.findOne.mock.mockImplementation(() => Promise.resolve(mockVinyl));
            orderRepository.create.mock.mockImplementation((data: any) => data);
            orderRepository.save.mock.mockImplementation((order: any) => Promise.resolve(mockOrder));
            orderItemRepository.create.mock.mockImplementation((data: any) => mockOrderItem);
            orderItemRepository.save.mock.mockImplementation((item: any) => Promise.resolve(item));
            mockStripe.paymentIntents.create.mock.mockImplementation(() => {
                throw new Error('Stripe error');
            });
            orderRepository.remove.mock.mockImplementation(() => Promise.resolve());
            orderItemRepository.remove.mock.mockImplementation(() => Promise.resolve());

            await assert.rejects(
                () => service.createPaymentIntent('user-1', { vinylId: 'vinyl-1' }),
                { name: 'BadRequestException' }
            );

            assert.strictEqual(orderRepository.remove.mock.callCount(), 1);
            assert.strictEqual(orderItemRepository.remove.mock.callCount(), 1);
        });

        it('should convert price to cents correctly', async () => {
            const mockVinyl = { id: 'vinyl-1', name: 'Album', price: 19.99 };
            const mockOrder = { id: 'order-1' };
            const mockPaymentIntent = { id: 'pi_123', client_secret: 'secret' };

            vinylsService.findOne.mock.mockImplementation(() => Promise.resolve(mockVinyl));
            orderRepository.create.mock.mockImplementation((data: any) => data);
            orderRepository.save.mock.mockImplementation((o: any) => Promise.resolve({ ...o, id: 'order-1' }));
            orderItemRepository.create.mock.mockImplementation((data: any) => data);
            orderItemRepository.save.mock.mockImplementation((i: any) => Promise.resolve(i));
            mockStripe.paymentIntents.create.mock.mockImplementation(() => Promise.resolve(mockPaymentIntent));

            const result = await service.createPaymentIntent('user-1', { vinylId: 'vinyl-1' });

            assert.strictEqual(result.amount, 1999); // 19.99 * 100
        });
    });

    describe('handleWebhook', () => {
        it('should handle payment_intent.succeeded event', async () => {
            const signature = 'test-signature';
            const rawBody = Buffer.from('test-body');

            const mockEvent = {
                type: 'payment_intent.succeeded',
                data: {
                    object: {
                        id: 'pi_123',
                    },
                },
            };

            const mockOrder = {
                id: 'order-1',
                status: 'PENDING',
                user: { email: 'user@test.com' },
                items: [],
            };

            mockStripe.webhooks.constructEvent.mock.mockImplementation(() => mockEvent);
            orderRepository.findOne.mock.mockImplementation(() => Promise.resolve(mockOrder));
            orderRepository.save.mock.mockImplementation((o: any) => Promise.resolve(o));
            emailService.sendOrderConfirmation.mock.mockImplementation(() => Promise.resolve());

            await service.handleWebhook(signature, rawBody);

            assert.strictEqual(mockOrder.status, 'completed');
            assert.strictEqual(orderRepository.save.mock.callCount(), 1);
            assert.strictEqual(emailService.sendOrderConfirmation.mock.callCount(), 1);
        });

        it('should handle payment_intent.payment_failed event', async () => {
            const signature = 'test-signature';
            const rawBody = Buffer.from('test-body');

            const mockEvent = {
                type: 'payment_intent.payment_failed',
                data: {
                    object: {
                        id: 'pi_123',
                        last_payment_error: {
                            message: 'Card declined',
                        },
                    },
                },
            };

            const mockOrder = {
                id: 'order-1',
                status: 'PENDING',
                user: { email: 'user@test.com' },
            };

            mockStripe.webhooks.constructEvent.mock.mockImplementation(() => mockEvent);
            orderRepository.findOne.mock.mockImplementation(() => Promise.resolve(mockOrder));
            orderRepository.save.mock.mockImplementation((o: any) => Promise.resolve(o));
            emailService.sendPaymentFailure.mock.mockImplementation(() => Promise.resolve());

            await service.handleWebhook(signature, rawBody);

            assert.strictEqual(mockOrder.status, 'failed');
            assert.strictEqual(orderRepository.save.mock.callCount(), 1);
            assert.strictEqual(emailService.sendPaymentFailure.mock.callCount(), 1);
        });

        it('should throw BadRequestException on invalid signature', async () => {
            const signature = 'invalid-signature';
            const rawBody = Buffer.from('test-body');

            mockStripe.webhooks.constructEvent.mock.mockImplementation(() => {
                throw new Error('Invalid signature');
            });

            await assert.rejects(
                () => service.handleWebhook(signature, rawBody),
                { name: 'BadRequestException' }
            );
        });

        it('should ignore unhandled event types', async () => {
            const signature = 'test-signature';
            const rawBody = Buffer.from('test-body');

            const mockEvent = {
                type: 'customer.created',
                data: { object: {} },
            };

            mockStripe.webhooks.constructEvent.mock.mockImplementation(() => mockEvent);

            // Should not throw
            await service.handleWebhook(signature, rawBody);

            assert.strictEqual(orderRepository.save.mock.callCount(), 0);
        });

        it('should handle missing order gracefully', async () => {
            const signature = 'test-signature';
            const rawBody = Buffer.from('test-body');

            const mockEvent = {
                type: 'payment_intent.succeeded',
                data: {
                    object: { id: 'pi_123' },
                },
            };

            mockStripe.webhooks.constructEvent.mock.mockImplementation(() => mockEvent);
            orderRepository.findOne.mock.mockImplementation(() => Promise.resolve(null));

            // Should not throw
            await service.handleWebhook(signature, rawBody);

            assert.strictEqual(orderRepository.save.mock.callCount(), 0);
        });
    });

    describe('getUserOrders', () => {
        it('should return user orders', async () => {
            const userId = 'user-1';
            const mockOrders = [
                { id: 'order-1', userId, status: 'COMPLETED' },
                { id: 'order-2', userId, status: 'PENDING' },
            ];

            orderRepository.find.mock.mockImplementation(() => Promise.resolve(mockOrders));

            const result = await service.getUserOrders(userId);

            assert.strictEqual(result.length, 2);
            assert.strictEqual(orderRepository.find.mock.callCount(), 1);

            const findCall = orderRepository.find.mock.calls[0].arguments[0];
            assert.strictEqual(findCall.where.userId, userId);
            assert.ok(findCall.relations.includes('items'));
            assert.ok(findCall.relations.includes('items.vinyl'));
        });

        it('should order by createdAt DESC', async () => {
            orderRepository.find.mock.mockImplementation(() => Promise.resolve([]));

            await service.getUserOrders('user-1');

            const findCall = orderRepository.find.mock.calls[0].arguments[0];
            assert.strictEqual(findCall.order.createdAt, 'DESC');
        });
    });

    describe('getOrder', () => {
        it('should return order for user', async () => {
            const orderId = 'order-1';
            const userId = 'user-1';
            const mockOrder = { id: orderId, userId, status: 'COMPLETED' };

            orderRepository.findOne.mock.mockImplementation(() => Promise.resolve(mockOrder));

            const result = await service.getOrder(orderId, userId);

            assert.strictEqual(result.id, orderId);
            assert.strictEqual(orderRepository.findOne.mock.callCount(), 1);
        });

        it('should throw NotFoundException if order does not exist', async () => {
            orderRepository.findOne.mock.mockImplementation(() => Promise.resolve(null));

            await assert.rejects(
                () => service.getOrder('not-exist', 'user-1'),
                { name: 'NotFoundException', message: 'Order not found' }
            );
        });

        it('should throw NotFoundException if order belongs to different user', async () => {
            orderRepository.findOne.mock.mockImplementation(() => Promise.resolve(null));

            await assert.rejects(
                () => service.getOrder('order-1', 'wrong-user'),
                { name: 'NotFoundException' }
            );
        });

        it('should include order items and vinyl relations', async () => {
            const mockOrder = { id: 'order-1', userId: 'user-1' };
            orderRepository.findOne.mock.mockImplementation(() => Promise.resolve(mockOrder));

            await service.getOrder('order-1', 'user-1');

            const findCall = orderRepository.findOne.mock.calls[0].arguments[0];
            assert.ok(findCall.relations.includes('items'));
            assert.ok(findCall.relations.includes('items.vinyl'));
        });
    });
});