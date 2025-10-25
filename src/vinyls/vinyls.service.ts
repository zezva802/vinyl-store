import {
    Injectable,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Vinyl } from './entities/vinyl.entity';
import { CreateVinylDto } from './dto/create-vinyl.dto';
import { QueryVinylDto } from './dto/query-vinyl.dto';
import { PaginatedVinyls } from './interfaces/paginated-vinyls.interface';
import { UpdateVinylDto } from './dto/update-vinyl.dto';
import { DiscogsService } from 'src/discogs/discogs.service';

@Injectable()
export class VinylsService {
    constructor(
        @InjectRepository(Vinyl)
        private readonly vinylRepository: Repository<Vinyl>,
        private readonly discogsService: DiscogsService
    ) {}

    async create(createVinylDto: CreateVinylDto): Promise<Vinyl> {
        const vinyl = this.vinylRepository.create(createVinylDto);
        return this.vinylRepository.save(vinyl);
    }

    async findAll(
        query: QueryVinylDto,
        currentUserId?: string
    ): Promise<PaginatedVinyls> {
        const {
            page = 1,
            limit = 20,
            search,
            authorName,
            sortBy = 'createdAt',
            order = 'DESC',
        } = query;

        const queryBuilder = this.vinylRepository
            .createQueryBuilder('vinyl')
            .leftJoinAndSelect(
                'vinyl.reviews',
                'reviews',
                'reviews.isDeleted = :reviewDeleted',
                { reviewDeleted: false }
            )
            .leftJoinAndSelect('reviews.user', 'user')
            .where('vinyl.isDeleted = :isDeleted', { isDeleted: false });

        if (search) {
            queryBuilder.andWhere(
                '(vinyl.name LIKE :search OR vinyl.authorName LIKE :search)',
                { search: `%${search}%` }
            );
        }

        if (authorName) {
            queryBuilder.andWhere('vinyl.authorName LIKE :authorName', {
                authorName: `%${authorName}%`,
            });
        }

        queryBuilder.orderBy(`vinyl.${sortBy}`, order);

        queryBuilder.skip((page - 1) * limit).take(limit);

        const [vinyls, total] = await queryBuilder.getManyAndCount();

        const data = vinyls.map((vinyl) => {
            const activeReviews = vinyl.reviews.filter((r) => !r.isDeleted);

            const reviewsToShow = currentUserId
                ? activeReviews.filter((r) => r.userId !== currentUserId)
                : activeReviews;

            const averageScore =
                activeReviews.length > 0
                    ? activeReviews.reduce((sum, r) => sum + r.score, 0) /
                      activeReviews.length
                    : 0;

            const firstReview =
                reviewsToShow.length > 0 ? reviewsToShow[0] : null;

            return {
                ...vinyl,
                averageScore: Math.round(averageScore * 10) / 10,
                firstReview: firstReview
                    ? {
                          id: firstReview.id,
                          comment: firstReview.comment,
                          score: firstReview.score,
                          createdAt: firstReview.createdAt,
                          user: {
                              firstName: firstReview.user.firstName,
                              lastName: firstReview.user.lastName,
                          },
                      }
                    : null,
                reviews: undefined,
            };
        });

        return {
            data: data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async findOne(id: string): Promise<Vinyl> {
        const vinyl = await this.vinylRepository.findOne({
            where: { id, isDeleted: false },
            relations: ['reviews'],
        });

        if (!vinyl) {
            throw new NotFoundException('Vinyl not found');
        }

        return vinyl;
    }

    async update(id: string, updateVinylDto: UpdateVinylDto): Promise<Vinyl> {
        const vinyl = await this.vinylRepository.findOne({
            where: { id, isDeleted: false },
        });

        if (!vinyl) {
            throw new NotFoundException('Vinyl not found');
        }

        Object.assign(vinyl, updateVinylDto);

        await this.vinylRepository.save(vinyl);

        return this.vinylRepository.findOne({
            where: { id },
        }) as Promise<Vinyl>;
    }

    async remove(id: string): Promise<void> {
        const vinyl = await this.vinylRepository.findOne({
            where: { id, isDeleted: false },
        });

        if (!vinyl) {
            throw new NotFoundException('Vinyl not found');
        }

        vinyl.isDeleted = true;
        await this.vinylRepository.save(vinyl);
    }

    async findOneWithAverageScore(
        id: string
    ): Promise<Vinyl & { averageScore: number }> {
        const vinyl = await this.findOne(id);

        const activeReviews = vinyl.reviews.filter((r) => !r.isDeleted);
        const averageScore =
            activeReviews.length > 0
                ? activeReviews.reduce((sum, review) => sum + review.score, 0) /
                  activeReviews.length
                : 0;

        return {
            ...vinyl,
            averageScore: Math.round(averageScore * 10) / 10,
        };
    }

    async createFromDiscogs(discogsId: string, price: number): Promise<Vinyl> {
        const existing = await this.vinylRepository.findOne({
            where: { discogsId, isDeleted: false },
        });

        if (existing) {
            throw new BadRequestException(
                'This Discogs release already exists in the store'
            );
        }

        const release = await this.discogsService.getRelease(discogsId);

        const vinylData = this.discogsService.formatReleaseForVinyl(release);

        const vinyl = this.vinylRepository.create({
            ...vinylData,
            price,
        });

        return this.vinylRepository.save(vinyl);
    }
}
