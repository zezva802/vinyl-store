import { IsNotEmpty, IsString, IsInt, Min, Max } from 'class-validator';

export class CreateReviewDto {
    @IsString()
    @IsNotEmpty()
    vinylId: string;

    @IsString()
    @IsNotEmpty()
    comment: string;

    @IsInt()
    @Min(1)
    @Max(10)
    score: number;
}
