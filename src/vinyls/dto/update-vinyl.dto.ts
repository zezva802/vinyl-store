import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVinylDto {
    @ApiProperty({
        description: 'Updated name of the vinyl album',
        example: 'The Dark Side of the Moon (Remastered)',
        required: false,
    })
    @IsOptional()
    @IsString()
    name?: string;

    @ApiProperty({
        description: 'Updated artist or band name',
        example: 'Pink Floyd',
        required: false,
    })
    @IsOptional()
    @IsString()
    authorName?: string;

    @ApiProperty({
        description: 'Updated description',
        example: 'Progressive rock masterpiece from 1973 - 2023 Remaster',
        required: false,
    })
    @IsOptional()
    @IsString()
    description?: string;

    @ApiProperty({
        description: 'Updated price in USD',
        example: 35.99,
        minimum: 0,
        required: false,
    })
    @IsOptional()
    @IsNumber()
    @Min(0)
    price?: number;

    @ApiProperty({
        description: 'Updated image URL',
        example: 'https://example.com/covers/dark-side-remaster.jpg',
        required: false,
    })
    @IsOptional()
    @IsString()
    imageUrl?: string;
}
