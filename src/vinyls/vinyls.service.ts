import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, Like } from 'typeorm';
import { Vinyl } from './entities/vinyl.entity';
import { CreateVinylDto } from './dto/create-vinyl.dto';
import { QueryVinylDto } from './dto/query-vinyl.dto';
import { PaginatedVinyls } from './interfaces/paginated-vinyls.interface';
import { UpdateVinylDto } from './dto/update-vinyl.dto';

@Injectable()
export class VinylsService {
    constructor(
        @InjectRepository(Vinyl)
        private readonly vinylRepository: Repository<Vinyl>
    ) {}

    async create(createVinylDto: CreateVinylDto): Promise<Vinyl> {
        const vinyl = this.vinylRepository.create(createVinylDto);
        return this.vinylRepository.save(vinyl);
    }

    async findAll(query: QueryVinylDto): Promise<PaginatedVinyls> {
        const {
            page = 1,
            limit = 20,
            search,
            authorName,
            sortBy = 'createdAt',
            order = 'DESC',
        } = query;

        const where: FindOptionsWhere<Vinyl> = {
            isDeleted: false,
        };

        if (search) {
            const queryBuilder = this.vinylRepository
                .createQueryBuilder('vinyl')
                .where('vinyl.isDeleted = :isDeleted', { isDeleted: false })
                .andWhere(
                    '(vinyl.name LIKE :search OR vinyl.authorName LIKE :search)',
                    { search: `%${search}%` }
                );

            if (authorName) {
                queryBuilder.andWhere('vinyl.authorName LIKE :authorName', {
                    authorName: `%${authorName}$%`,
                });
            }

            queryBuilder.orderBy(`vinyl.${sortBy}`, order);

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

        if (authorName) {
            where.authorName = Like(`%${authorName}$%`);
        }

        const [data, total] = await this.vinylRepository.findAndCount({
            where,
            order: { [sortBy]: order },
            skip: (page - 1) * limit,
            take: limit,
        });

        return {
            data,
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

        Object.assign(vinyl, UpdateVinylDto);

        return this.vinylRepository.save(vinyl);
    }

    async update(id: string, updateVinylDto: UpdateVinylDto): Promise<Vinyl> {
        const vinyl = await this.vinylRepository.findOne({
            where: { id, isDeleted: false },
        });

        if (!vinyl) {
            throw new NotFoundException('Vinyl not found');
        }

        Object.assign(vinyl, updateVinylDto);

        return this.vinylRepository.save(vinyl);
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
}
