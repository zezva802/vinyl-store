import {
    Controller,
    UseGuards,
    Get,
    Patch,
    Body,
    Delete,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('profile')
    async getProfile(@CurrentUser() user: User): Promise<User> {
        return this.usersService.getProfile(user.id);
    }

    @Patch('profile')
    async updateProfile(
        @CurrentUser() user: User,
        @Body() updateUserDto: UpdateUserDto
    ): Promise<UserResponseDto> {
        const updatedUser = await this.usersService.updateProfile(
            user.id,
            updateUserDto
        );

        return {
            id: updatedUser.id,
            email: updatedUser.email,
            firstName: updatedUser.firstName,
            lastName: updatedUser.lastName,
            birthDate: updatedUser.birthDate,
            avatar: updatedUser.avatar,
            role: updatedUser.role,
            createdAt: updatedUser.createdAt,
        };
    }

    @Delete('profile')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteAccount(@CurrentUser() user: User): Promise<void> {
        await this.usersService.deleteAccount(user.id);
    }
}
