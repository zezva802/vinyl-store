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
    UseInterceptors,
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
import { AuditInterceptor } from 'src/common/interceptors/audit.interceptor';
import {
    ApiTags,
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
} from '@nestjs/swagger';

@ApiTags('reviews')
@Controller('reviews')
@UseInterceptors(AuditInterceptor)
export class ReviewsController {
    constructor(private readonly reviewsService: ReviewsService) {}

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Create a review for a vinyl record' })
    @ApiResponse({ status: 201, description: 'Review created successfully' })
    @ApiResponse({ status: 400, description: 'Already reviewed this vinyl' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 404, description: 'Vinyl not found' })
    async create(
        @CurrentUser() user: User,
        @Body() createReviewDto: CreateReviewDto
    ): Promise<Review> {
        return this.reviewsService.create(user.id, createReviewDto);
    }

    @Get()
    @Public()
    @ApiOperation({ summary: 'Get all reviews with pagination' })
    @ApiResponse({ status: 200, description: 'Returns paginated reviews' })
    async findAll(@Query() query: QueryReviewDto): Promise<PaginatedReviews> {
        return this.reviewsService.findAll(query);
    }

    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Get a specific review by ID' })
    @ApiResponse({ status: 200, description: 'Returns review details' })
    @ApiResponse({ status: 404, description: 'Review not found' })
    async findOne(@Param('id') id: string): Promise<Review> {
        return this.reviewsService.findOne(id);
    }

    @Delete(':id')
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(JwtAuthGuard, RolesGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Delete a review',
        description:
            'Users can delete their own reviews. Admins can delete any review.',
    })
    @ApiResponse({ status: 204, description: 'Review deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Not your review' })
    @ApiResponse({ status: 404, description: 'Review not found' })
    async remove(
        @Param('id') id: string,
        @CurrentUser() user: User
    ): Promise<void> {
        const isAdmin = user.role === UserRole.ADMIN;
        return this.reviewsService.remove(id, user.id, isAdmin);
    }
}
