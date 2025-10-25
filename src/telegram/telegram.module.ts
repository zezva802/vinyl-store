import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramController } from './telegram.controller';
import { VinylsModule } from 'src/vinyls/vinyls.module';

@Module({
    imports:[VinylsModule],
    providers: [TelegramService],
    controllers: [TelegramController],
    exports: [TelegramService],
})
export class TelegramModule {}