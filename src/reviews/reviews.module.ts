import { Module } from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { VinylsModule } from '../vinyls/vinyls.module';
import { Review } from './entities/review.entity';

@Module({
    imports: [TypeOrmModule.forFeature([Review]), VinylsModule],
    providers: [ReviewsService],
    controllers: [ReviewsController],
    exports: [ReviewsService],
})
export class ReviewsModule {}
