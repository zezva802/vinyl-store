import {
    IsNotEmpty,
    IsOptional,
    IsString,
    IsNumber,
    Min,
    MaxLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVinylDto {
    @ApiProperty({
        description: 'Name of the vinyl album',
        example: 'Dark Side of the Moon',
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(255)
    name: string;

    @ApiProperty({
        description: 'Artist or band name',
        example: 'Pink Floyd',
    })
    @IsString()
    @IsNotEmpty()
    authorName: string;

    @ApiProperty({
        description: 'Detailed description of the album',
        example: 'Progressive rock masterpiece from 1973',
    })
    @IsString()
    @IsNotEmpty()
    description: string;

    @ApiProperty({
        description: 'Price in USD',
        example: 29.99,
        minimum: 0,
    })
    @IsNumber()
    @Min(0)
    price: number;

    @ApiProperty({
        description: 'URL of the album cover image',
        example: 'https://example.com/covers/dark-side.jpg',
        required: false,
    })
    @IsOptional()
    @IsString()
    imageUrl?: string;
}
