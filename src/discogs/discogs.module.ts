import { Module } from '@nestjs/common';
import { DiscogsService } from './discogs.service';
import { DiscogsController } from './discogs.controller';

@Module({
    providers: [DiscogsService],
    controllers: [DiscogsController],
    exports: [DiscogsService],
})
export class DiscogsModule {}