import { Module } from '@nestjs/common';
import { VinylsService } from './vinyls.service';
import { VinylsController } from './vinyls.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Vinyl } from './entities/vinyl.entity';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';
import { DiscogsModule } from 'src/discogs/discogs.module';

@Module({
    imports: [TypeOrmModule.forFeature([Vinyl]), AuditLogsModule, DiscogsModule],
    providers: [VinylsService],
    controllers: [VinylsController],
    exports: [VinylsService],
})
export class VinylsModule {}
