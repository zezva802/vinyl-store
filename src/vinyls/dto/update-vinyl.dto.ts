import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class UpdateVinylDto {
    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    authorName?: string;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @IsOptional()
    @IsString()
    imageUrl?: string;
}
