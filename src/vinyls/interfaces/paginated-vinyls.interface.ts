import { Vinyl } from '../entities/vinyl.entity';

export interface PaginatedVinyls {
    data: Vinyl[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}
