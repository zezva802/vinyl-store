import {
    Controller,
    UseGuards,
    Post,
    Body,
    Headers,
    Req,
    Get,
    Param,
} from '@nestjs/common';
import type { RawBodyRequest } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { User } from 'src/users/entities/user.entity';
import { CreatePaymentIntentDto } from './dto/create-payment-intent.dto';
import { PaymentIntentResponseDto } from './dto/payment-intent-response.dto';
import { Public } from 'src/auth/decorators/public.decorator';
import { Request } from 'express';
import { Order } from './entities/order.entity';

@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @Post('create-payment-intent')
    @UseGuards(JwtAuthGuard)
    async createPaymentIntent(
        @CurrentUser() user: User,
        @Body() createPaymentIntentDto: CreatePaymentIntentDto
    ): Promise<PaymentIntentResponseDto> {
        return this.ordersService.createPaymentIntent(
            user.id,
            createPaymentIntentDto
        );
    }

    @Post('webhook')
    @Public()
    async handleWebHook(
        @Headers('stripe-signature') signature: string,
        @Req() request: RawBodyRequest<Request>
    ): Promise<{ received: boolean }> {
        const rawBody = request.rawBody;

        if (!rawBody) {
            throw new Error('Raw body is required for webhook verification');
        }

        await this.ordersService.handleWebHook(signature, rawBody);

        return { received: true };
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    async getUserOrders(@CurrentUser() user: User): Promise<Order[]> {
        return this.ordersService.getUserOrders(user.id);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    async getOrder(
        @Param('id') id: string,
        @CurrentUser() user: User
    ): Promise<Order> {
        return this.ordersService.getOrder(id, user.id);
    }
}
