import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import TelegramBot from 'node-telegram-bot-api';
import { Vinyl } from '../vinyls/entities/vinyl.entity';

@Injectable()
export class TelegramService {
    private bot: TelegramBot | null = null;
    private channelId: string;
    private storeFrontendUrl: string;

    constructor(private configService: ConfigService) {
        const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
        this.channelId = this.configService.get<string>('TELEGRAM_CHANNEL_ID')!;
        this.storeFrontendUrl =
            this.configService.get<string>('FRONTEND_URL') ??
            'http://localhost:3000';

        if (token && this.channelId) {
            this.bot = new TelegramBot(token, { polling: false });
            // eslint-disable-next-line no-console
            console.log('✅ Telegram bot initialized successfully');
        } else {
            console.warn(
                '⚠️  Telegram integration disabled: Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHANNEL_ID'
            );
        }
    }

    async postVinylToChannel(vinyl: Vinyl): Promise<boolean> {
        if (!this.bot) {
            console.warn(
                'Telegram bot not configured. Skipping channel post.'
            );
            return false;
        }

        try {
            const message = this.formatVinylMessage(vinyl);
            const storeLink = `${this.storeFrontendUrl}/vinyls/${vinyl.id}`;

            const keyboard = {
                inline_keyboard: [
                    [
                        {
                            text: '🛒 View in Store',
                            url: storeLink,
                        },
                    ],
                ],
            };

            if (vinyl.imageUrl) {
                await this.bot.sendPhoto(this.channelId, vinyl.imageUrl, {
                    caption: message,
                    parse_mode: 'HTML',
                    reply_markup: keyboard,
                });
            } else {
                await this.bot.sendMessage(this.channelId, message, {
                    parse_mode: 'HTML',
                    reply_markup: keyboard,
                });
            }

            // eslint-disable-next-line no-console
            console.log(
                `Posted vinyl "${vinyl.name}" to Telegram channel ${this.channelId}`
            );
            return true;
        } catch (error) {
            console.error(
                `Failed to post vinyl to Telegram:`,
                error instanceof Error ? error.message : 'Unknown error'
            );
            return false;
        }
    }

    private formatVinylMessage(vinyl: Vinyl): string {
        const discogsInfo = vinyl.discogsScore
            ? `\n📊 Discogs Score: ${vinyl.discogsScore}/5.00`
            : '';

        return `
        🎵 <b>New Vinyl Available!</b>

        <b>${vinyl.name}</b>
        🎤 Artist: ${vinyl.authorName}

        💿 ${vinyl.description}

        💰 Price: $${Number(vinyl.price).toFixed(2)}${discogsInfo}

        #NewArrival #${vinyl.authorName.replace(/\s+/g, '')}
            `.trim();
    }

    async sendCustomMessage(message: string): Promise<boolean> {
        if (!this.bot) {
            return false;
        }

        try {
            await this.bot.sendMessage(this.channelId, message, {
                parse_mode: 'HTML',
            });
            return true;
        } catch (error) {
            console.error('Failed to send Telegram message:', error);
            return false;
        }
    }

    isConfigured(): boolean {
        return this.bot !== null;
    }

    getChannelId(): string {
        return this.channelId;
    }
}