import { IsOptional, IsString, IsDateString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateUserDto {
    @ApiProperty({
        description: 'User first name',
        example: 'John',
        required: false,
    })
    @IsOptional()
    @IsString()
    firstName?: string;

    @ApiProperty({
        description: 'User last name',
        example: 'Doe',
        required: false,
    })
    @IsOptional()
    @IsString()
    lastName?: string;

    @ApiProperty({
        description: 'Birth date in ISO format',
        example: '1990-01-15',
        required: false,
    })
    @IsOptional()
    @IsDateString()
    birthDate?: string;

    @ApiProperty({
        description: 'Avatar URL',
        example: 'https://example.com/avatars/john.jpg',
        required: false,
    })
    @IsOptional()
    @IsString()
    avatar?: string;
}
