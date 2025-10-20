import { Review } from '../entities/review.entity';

export interface PaginatedReviews {
    data: Review[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
