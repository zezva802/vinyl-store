import {
    BadRequestException,
    ForbiddenException,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from './entities/review.entity';
import { VinylsService } from 'src/vinyls/vinyls.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { QueryReviewDto } from './dto/query-review.dto';
import { PaginatedReviews } from './interfaces/paginated-reviews.interface';

@Injectable()
export class ReviewsService {
    constructor(
        @InjectRepository(Review)
        private readonly reviewRepository: Repository<Review>,
        private readonly vinylsService: VinylsService
    ) {}

    async create(
        userId: string,
        createReviewDto: CreateReviewDto
    ): Promise<Review> {
        const { vinylId, comment, score } = createReviewDto;

        await this.vinylsService.findOne(vinylId);

        const existingReview = await this.reviewRepository.findOne({
            where: { userId, vinylId, isDeleted: false },
        });

        if (existingReview) {
            throw new BadRequestException(
                'You have already reviewed this vinyl'
            );
        }

        const review = this.reviewRepository.create({
            userId,
            vinylId,
            comment,
            score,
        });

        return this.reviewRepository.save(review);
    }

    async findAll(query: QueryReviewDto): Promise<PaginatedReviews> {
        const { page = 1, limit = 20, vinylId } = query;

        const queryBuilder = this.reviewRepository
            .createQueryBuilder('review')
            .leftJoinAndSelect('review.user', 'user')
            .where('review.isDeleted = :isDeleted', { isDeleted: false });

        if (vinylId) {
            queryBuilder.andWhere('review.vinylId = :vinylId', { vinylId });
        }

        queryBuilder.orderBy('review.createdAt', 'DESC');

        queryBuilder.skip((page - 1) * limit).take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string): Promise<Review> {
        const review = await this.reviewRepository.findOne({
            where: { id, isDeleted: false },
            relations: ['user', 'vinyl'],
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        return review;
    }

    async remove(id: string, userId: string, isAdmin: boolean): Promise<void> {
        const review = await this.reviewRepository.findOne({
            where: { id, isDeleted: false },
        });

        if (!review) {
            throw new NotFoundException('Review not found');
        }

        if (review.userId !== userId && !isAdmin) {
            throw new ForbiddenException(
                'You can only delete your own reviews'
            );
        }

        review.isDeleted = true;
        await this.reviewRepository.save(review);
    }
}
