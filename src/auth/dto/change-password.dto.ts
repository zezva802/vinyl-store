import { IsString, MinLength, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
    @ApiProperty({
        description: 'Current password',
        example: 'OldPassword123!',
    })
    @IsString()
    @MinLength(1)
    currentPassword: string;

    @ApiProperty({
        description: 'New password (min 8 characters)',
        example: 'NewPassword456!',
        minLength: 8,
    })
    @IsString()
    @MinLength(8)
    @MaxLength(100)
    newPassword: string;

    @ApiProperty({
        description: 'Confirm new password',
        example: 'NewPassword456!',
    })
    @IsString()
    @MinLength(8)
    @MaxLength(100)
    confirmPassword: string;
}
