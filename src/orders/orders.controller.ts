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
import {
    ApiTags,
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
    ApiExcludeEndpoint,
} from '@nestjs/swagger';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
    constructor(private readonly ordersService: OrdersService) {}

    @Post('create-payment-intent')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Create a payment intent for purchasing a vinyl',
        description: 'Creates a Stripe payment intent and pending order',
    })
    @ApiResponse({
        status: 201,
        description: 'Payment intent created successfully',
        type: PaymentIntentResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Vinyl not found' })
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
    @ApiExcludeEndpoint()
    async handleWebHook(
        @Headers('stripe-signature') signature: string,
        @Req() request: RawBodyRequest<Request>
    ): Promise<{ received: boolean }> {
        const rawBody = request.rawBody;

        if (!rawBody) {
            throw new Error('Raw body is required for webhook verification');
        }

        await this.ordersService.handleWebhook(signature, rawBody);

        return { received: true };
    }

    @Get()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get all orders for current user' })
    @ApiResponse({ status: 200, description: 'Returns user orders' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getUserOrders(@CurrentUser() user: User): Promise<Order[]> {
        return this.ordersService.getUserOrders(user.id);
    }

    @Get(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get a specific order by ID' })
    @ApiResponse({ status: 200, description: 'Returns order details' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Order not found' })
    async getOrder(
        @Param('id') id: string,
        @CurrentUser() user: User
    ): Promise<Order> {
        return this.ordersService.getOrder(id, user.id);
    }
}
