import { IsEmail, IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
    @ApiProperty({
        description: 'User email address',
        example: 'john.doe@example.com',
    })
    @IsEmail()
    email: string;

    @ApiProperty({
        description: 'Password (min 8 characters)',
        example: 'SecurePass123!',
        minLength: 8,
    })
    @IsString()
    @MinLength(8)
    @MaxLength(100)
    password: string;

    @ApiProperty({
        description: 'First name',
        example: 'John',
        required: false,
    })
    @IsString()
    firstName?: string;

    @ApiProperty({
        description: 'Last name',
        example: 'Doe',
        required: false,
    })
    @IsString()
    lastName?: string;
}
