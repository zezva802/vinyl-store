import {
    Controller,
    UseGuards,
    Post,
    Body,
    Get,
    Query,
    Param,
    Delete,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { CurrentUser } from 'src/auth/decorators/current-user.decorator';
import { User, UserRole } from 'src/users/entities/user.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { Review } from './entities/review.entity';
import { QueryReviewDto } from './dto/query-review.dto';
import { PaginatedReviews } from './interfaces/paginated-reviews.interface';
import { Public } from 'src/auth/decorators/public.decorator';
import { RolesGuard } from 'src/auth/guards/roles.guard';

@Controller('reviews')
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    async create(
        @CurrentUser() user: User,
        @Body() createReviewDto: CreateReviewDto
    ): Promise<Review> {
        return this.reviewsService.create(user.id, createReviewDto);
    }

    @Get()
    @Public()
    async findAll(@Query() query: QueryReviewDto): Promise<PaginatedReviews> {
        return this.reviewsService.findAll(query);
    }

    @Get(':id')
    @Public()
    async findOne(@Param('id') id: string): Promise<Review> {
        return this.reviewsService.findOne(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(JwtAuthGuard, RolesGuard)
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: User
    ): Promise<void> {
        const isAdmin = user.role === UserRole.ADMIN;
        return this.reviewsService.remove(id, user.id, isAdmin);
    }
}
