import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';
import { Order } from '../orders/entities/order.entity';

@Injectable()
export class EmailService {
    private transporter: Transporter;

    constructor(private readonly configService: ConfigService) {
        this.transporter = nodemailer.createTransport({
            host: this.configService.get<string>('EMAIL_HOST'),
            port: this.configService.get<number>('EMAIL_PORT'),
            secure: false,
            auth: {
                user: this.configService.get<string>('EMAIL_USER'),
                pass: this.configService.get<string>('EMAIL_PASSWORD'),
            },
        });
    }

    async sendOrderConfirmation(
        userEmail: string,
        order: Order
    ): Promise<void> {
        const vinylNames = order.items
            .map((item) => `- ${item.vinyl.name} ($${item.priceAtPurchase})`)
            .join('\n');

        const mailOptions = {
            from: this.configService.get<string>('EMAIL_FROM'),
            to: userEmail,
            subject: `Order Confirmation - #${order.id.substring(0, 8)}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #667eea;">Thank You for Your Order! 🎵</h2>
                    
                    <p>Your order has been confirmed and will be processed shortly.</p>
                    
                    <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h3 style="margin-top: 0;">Order Details</h3>
                        <p><strong>Order ID:</strong> ${order.id}</p>
                        <p><strong>Total Amount:</strong> $${order.totalAmount}</p>
                        <p><strong>Status:</strong> ${order.status}</p>
                    </div>
                    
                    <div style="margin: 20px 0;">
                        <h3>Items Purchased</h3>
                        <pre style="background-color: #f9fafb; padding: 15px; border-radius: 4px;">${vinylNames}</pre>
                    </div>
                    
                    <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                        If you have any questions about your order, please contact our support team.
                    </p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                    
                    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} Vinyl Store. All rights reserved.
                    </p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            // eslint-disable-next-line no-console
            console.log(`Order confirmation email sent to ${userEmail}`);
        } catch (error) {
            console.error(
                `Failed to send email to ${userEmail}:`,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }

    async sendPaymentFailure(
        userEmail: string,
        orderId: string,
        reason?: string
    ): Promise<void> {
        const mailOptions = {
            from: this.configService.get<string>('EMAIL_FROM'),
            to: userEmail,
            subject: 'Payment Failed - Action Required',
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                    <h2 style="color: #ef4444;">Payment Failed ⚠️</h2>
                    
                    <p>Unfortunately, your payment could not be processed.</p>
                    
                    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #ef4444;">
                        <p><strong>Order ID:</strong> ${orderId}</p>
                        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
                    </div>
                    
                    <p>Please try again or contact your payment provider for more information.</p>
                    
                    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;" />
                    
                    <p style="color: #9ca3af; font-size: 12px; text-align: center;">
                        © ${new Date().getFullYear()} Vinyl Store. All rights reserved.
                    </p>
                </div>
            `,
        };

        try {
            await this.transporter.sendMail(mailOptions);
            // eslint-disable-next-line no-console
            console.log(`Payment failure email sent to ${userEmail}`);
        } catch (error) {
            console.error(
                `Failed to send email to ${userEmail}:`,
                error instanceof Error ? error.message : 'Unknown error'
            );
        }
    }
}
