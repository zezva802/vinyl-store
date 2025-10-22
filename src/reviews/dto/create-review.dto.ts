import { IsNotEmpty, IsString, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
    @ApiProperty({
        description: 'ID of the vinyl record being reviewed',
        example: '550e8400-e29b-41d4-a716-446655440000',
    })
    @IsString()
    @IsNotEmpty()
    vinylId: string;

    @ApiProperty({
        description: 'Review comment',
        example: 'Amazing album! The sound quality is incredible.',
    })
    @IsString()
    @IsNotEmpty()
    comment: string;

    @ApiProperty({
        description: 'Rating score (1-10)',
        example: 9,
        minimum: 1,
        maximum: 10,
    })
    @IsInt()
    @Min(1)
    @Max(10)
    score: number;
}
