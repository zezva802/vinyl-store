import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VinylsModule } from '../vinyls/vinyls.module';
import { Review } from './entities/review.entity';
import { AuditLogsModule } from 'src/audit-logs/audit-logs.module';

@Module({
    imports: [
        TypeOrmModule.forFeature([Review]),
        VinylsModule,
        AuditLogsModule,
    ],
    providers: [ReviewsService],
    controllers: [ReviewsController],
    exports: [ReviewsService],
})
export class ReviewsModule {}
