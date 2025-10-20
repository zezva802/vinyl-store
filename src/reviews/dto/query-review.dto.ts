import { Type } from 'class-transformer';
import { IsOptional, Min, IsInt } from 'class-validator';

export class QueryReviewDto {
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    page?: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    limit?: number = 20;

    @IsOptional()
    vinylId?: string;
}
