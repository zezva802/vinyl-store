import { IsString, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateFromDiscogsDto {
    @ApiProperty({
        description: 'Discogs release ID',
        example: '249504',
    })
    @IsString()
    @IsNotEmpty()
    discogsId: string;

    @ApiProperty({
        description: 'Price in USD',
        example: 29.99,
        minimum: 0,
    })
    @IsNumber()
    @Min(0)
    price: number;
}