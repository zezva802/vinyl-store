import {
    IsNotEmpty,
    IsOptional,
    IsString,
    IsNumber,
    Min,
} from 'class-validator';

export class CreateVinylDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    authorName: string;

    @IsString()
    @IsNotEmpty()
    description: string;

    @IsNumber()
    @Min(0)
    price: number;

    @IsOptional()
    @IsString()
    imageUrl?: string;
}
