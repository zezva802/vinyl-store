import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Min, IsIn } from 'class-validator';

export class QueryVinylDto {
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
    @IsString()
    search?: string;

    @IsOptional()
    @IsString()
    authorName?: string;

    @IsOptional()
    @IsIn(['name', 'authorName', 'price', 'createdAt'])
    sortBy?: string = 'createdAt';

    @IsOptional()
    @IsIn(['ASC', 'DESC'])
    order?: 'ASC' | 'DESC' = 'DESC';
}
