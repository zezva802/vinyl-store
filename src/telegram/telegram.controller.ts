import {
    Controller,
    Post,
    Param,
    UseGuards,
    Body,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { VinylsService } from '../vinyls/vinyls.service';
import {
    ApiTags,
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
} from '@nestjs/swagger';
import { PostVinylToTelegramDto } from './dto/post-vinyl-to-telegram.dto';

@ApiTags('telegram')
@Controller('telegram')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class TelegramController {
    constructor(
        private readonly telegramService: TelegramService,
        private readonly vinylsService: VinylsService
    ) {}

    @Post('post-vinyl/:id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Post a vinyl to Telegram channel (Admin only)',
        description:
            'Posts vinyl details to configured Telegram channel with image and store link',
    })
    @ApiResponse({
        status: 200,
        description: 'Vinyl posted to Telegram successfully',
    })
    @ApiResponse({
        status: 400,
        description: 'Telegram not configured or posting failed',
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
    @ApiResponse({ status: 404, description: 'Vinyl not found' })
    async postVinylToChannel(
        @Param('id') vinylId: string
    ): Promise<{ message: string; success: boolean }> {
        if (!this.telegramService.isConfigured()) {
            return {
                message:
                    'Telegram integration is not configured. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHANNEL_ID environment variables.',
                success: false,
            };
        }

        const vinyl = await this.vinylsService.findOne(vinylId);

        const success = await this.telegramService.postVinylToChannel(vinyl);

        return {
            message: success
                ? `Vinyl "${vinyl.name}" posted to Telegram channel successfully`
                : 'Failed to post vinyl to Telegram channel',
            success,
        };
    }

    @Post('message')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Send custom message to Telegram channel (Admin only)',
        description: 'Send a custom announcement to the Telegram channel',
    })
    @ApiResponse({ status: 200, description: 'Message sent successfully' })
    @ApiResponse({ status: 400, description: 'Telegram not configured' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
    async sendMessage(
        @Body() dto: PostVinylToTelegramDto
    ): Promise<{ message: string; success: boolean }> {
        if (!this.telegramService.isConfigured()) {
            return {
                message: 'Telegram integration is not configured',
                success: false,
            };
        }

        const success = await this.telegramService.sendCustomMessage(
            dto.message
        );

        return {
            message: success
                ? 'Message sent to Telegram channel'
                : 'Failed to send message',
            success,
        };
    }
}