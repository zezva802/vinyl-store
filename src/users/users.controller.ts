import {
    Controller,
    UseGuards,
    Get,
    Patch,
    Body,
    Delete,
    HttpCode,
    HttpStatus,
    UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';
import { AuditInterceptor } from 'src/common/interceptors/audit.interceptor';
import {
    ApiTags,
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
} from '@nestjs/swagger';

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
@UseInterceptors(AuditInterceptor)
export class UsersController {
    constructor(private readonly usersService: UsersService) {}

    @Get('profile')
    @ApiOperation({
        summary: 'Get user profile',
        description: 'Returns profile with reviews and purchase history',
    })
    @ApiResponse({ status: 200, description: 'Returns user profile' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getProfile(@CurrentUser() user: User): Promise<User> {
        return this.usersService.getProfile(user.id);
    }

    @Patch('profile')
    @ApiOperation({ summary: 'Update user profile' })
    @ApiResponse({
        status: 200,
        description: 'Profile updated successfully',
        type: UserResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
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
    @ApiOperation({
        summary: 'Delete user account',
        description: 'Soft deletes the user account',
    })
    @ApiResponse({ status: 204, description: 'Account deleted successfully' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async deleteAccount(@CurrentUser() user: User): Promise<void> {
        await this.usersService.deleteAccount(user.id);
    }
}
