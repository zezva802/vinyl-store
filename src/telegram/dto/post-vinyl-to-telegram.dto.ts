import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PostVinylToTelegramDto {
    @ApiProperty({
        description: 'Custom message to send to Telegram channel',
        example: '🎉 Weekend Sale! 20% off all vinyl records!',
    })
    @IsString()
    @IsNotEmpty()
    message: string;
}
