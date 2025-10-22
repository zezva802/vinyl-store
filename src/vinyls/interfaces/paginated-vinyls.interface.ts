import { Vinyl } from '../entities/vinyl.entity';

export interface VinylWithMetadata extends Omit<Vinyl, 'reviews'> {
    averageScore: number;
    firstReview: {
        id: string;
        comment: string;
        score: number;
        createdAt: Date;
        user: {
            firstName: string;
            lastName: string;
        } | null;
    } | null;
}

export interface PaginatedVinyls {
    data: VinylWithMetadata[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
