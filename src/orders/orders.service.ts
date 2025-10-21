import {
    BadRequestException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Order, OrderStatus } from './entities/order.entity';
import { Repository } from 'typeorm';
import { OrderItem } from './entities/order-item.entity';
import { VinylsService } from '../vinyls/vinyls.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentIntentResponseDto } from './dto/payment-intent-response.dto';

@Injectable()
export class OrdersService {
    private stripe: Stripe;

    constructor(
        @InjectRepository(Order)
        private readonly orderRepository: Repository<Order>,
        @InjectRepository(OrderItem)
        private readonly orderItemRepository: Repository<OrderItem>,
        private readonly vinylsService: VinylsService,
        private readonly configService: ConfigService
    ) {
        const stripeSecretKey =
            this.configService.get<string>('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) {
            throw new Error(
                'STRIPE_SECRET_KEY is not defined in environment variables'
            );
        }

        this.stripe = new Stripe(stripeSecretKey, {
            apiVersion: '2025-09-30.clover',
        });
    }

    async createPaymentIntent(
        userId: string,
        createPaymentIntentDto: CreatePaymentIntentDto
    ): Promise<PaymentIntentResponseDto> {
        const { vinylId } = createPaymentIntentDto;

        const vinyl = await this.vinylsService.findOne(vinylId);

        const amountInCents = Math.round(Number(vinyl.price) * 100);

        const order = this.orderRepository.create({
            userId,
            status: OrderStatus.PENDING,
            totalAmount: vinyl.price,
            stripePaymentIntentId: '',
        });

        const savedOrder = await this.orderRepository.save(order);

        const orderItem = this.orderItemRepository.create({
            orderId: savedOrder.id,
            vinylId: vinyl.id,
            quantity: 1,
            priceAtPurchase: vinyl.price,
        });

        await this.orderItemRepository.save(orderItem);

        try {
            const paymentIntent = await this.stripe.paymentIntents.create({
                amount: amountInCents,
                currency: 'usd',
                metadata: {
                    orderId: savedOrder.id,
                    userId,
                    vinylId: vinyl.id,
                    vinylName: vinyl.name,
                },
                automatic_payment_methods: {
                    enabled: true,
                },
            });

            savedOrder.stripePaymentIntentId = paymentIntent.id;
            await this.orderRepository.save(savedOrder);

            return {
                clientSecret: paymentIntent.client_secret!,
                orderId: savedOrder.id,
                amount: amountInCents,
            };
        } catch (error) {
            await this.orderRepository.remove(savedOrder);
            await this.orderItemRepository.remove(orderItem);

            throw new BadRequestException(
                `Failed to create payment intent: ${error instanceof Error ? error.message : 'Unknown Error'}`
            );
        }
    }

    async handleWebhook(signature: string, rawBody: Buffer): Promise<void> {
        const webhookSecret = this.configService.get<string>(
            'STRIPE_WEBHOOK_SECRET'
        );

        if (!webhookSecret) {
            throw new Error('STRIPE_WEBHOOK_SECRET is not configured');
        }

        let event: Stripe.Event;

        try {
            event = this.stripe.webhooks.constructEvent(
                rawBody,
                signature,
                webhookSecret
            );
        } catch (error) {
            throw new BadRequestException(
                `Webhook signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }

        switch (event.type) {
            case 'payment_intent.succeeded':
                await this.handlePaymentSuccess(
                    event.data.object as Stripe.PaymentIntent
                );
                break;

            case 'payment_intent.payment_failed':
                await this.handlePaymentFailure(
                    event.data.object as Stripe.PaymentIntent
                );
                break;
            case 'charge.succeeded':
            case 'charge.updated':
            case 'payment_intent.created':
                break;

            default:
                // eslint-disable-next-line no-console
                console.log(`Unhandled event type: ${event.type}`);
        }
    }

    private async handlePaymentSuccess(
        paymentIntent: Stripe.PaymentIntent
    ): Promise<void> {
        const order = await this.orderRepository.findOne({
            where: { stripePaymentIntentId: paymentIntent.id },
        });

        if (!order) {
            console.error(
                `Order not found for payment intent: ${paymentIntent.id}`
            );
            return;
        }

        order.status = OrderStatus.COMPLETED;
        await this.orderRepository.save(order);
        // eslint-disable-next-line no-console
        console.log(`Order ${order.id} marked as COMPLETED`);

        // TODO: send confirmation email
    }

    private async handlePaymentFailure(
        paymentIntent: Stripe.PaymentIntent
    ): Promise<void> {
        const order = await this.orderRepository.findOne({
            where: { stripePaymentIntentId: paymentIntent.id },
        });

        if (!order) {
            console.error(
                `Order not found for payment intent: ${paymentIntent.id}`
            );
            return;
        }

        order.status = OrderStatus.FAILED;
        await this.orderRepository.save(order);
        // eslint-disable-next-line no-console
        console.log(`Order ${order.id} marked as FAILED`);
    }

    async getUserOrders(userId: string): Promise<Order[]> {
        return this.orderRepository.find({
            where: { userId },
            relations: ['items', 'items.vinyl'],
            order: { createdAt: 'DESC' },
        });
    }

    async getOrder(orderId: string, userId: string): Promise<Order> {
        const order = await this.orderRepository.findOne({
            where: { id: orderId, userId },
            relations: ['items', 'items.vinyl'],
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        return order;
    }
}
