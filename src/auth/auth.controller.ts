import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { LoginResponseDto } from './dto/login-response.dto';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
} from '@nestjs/swagger';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get('google')
    @UseGuards(GoogleAuthGuard)
    @ApiOperation({
        summary: 'Initiate Google OAuth login',
        description: 'Redirects to Google OAuth consent screen',
    })
    @ApiResponse({ status: 302, description: 'Redirect to Google' })
    async googleAuth(): Promise<void> {}

    /**
     * Note: Using 'any' for req type due to Passport's dynamic user attachment.
     * In production, would extend Express Request interface with GoogleUser type.
     * Isolated to this single callback - all other endpoints use @CurrentUser() decorator.
     */
    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    @ApiOperation({
        summary: 'Google OAuth callback',
        description: 'Handles Google OAuth callback and returns JWT token',
    })
    @ApiResponse({
        status: 200,
        description: 'Returns JWT token and user info',
        type: LoginResponseDto,
    })
    // eslint-disable-next-line
    async googleAuthCallback(@Req() req: any): Promise<LoginResponseDto> {
        return this.authService.googleLogin(req.user);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({ summary: 'Get current authenticated user' })
    @ApiResponse({ status: 200, description: 'Returns current user info' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async getMe(@CurrentUser() user: User): Promise<User> {
        return user;
    }

    @Get('logout')
    @ApiOperation({
        summary: 'Logout',
        description: 'Client should remove JWT token from storage',
    })
    @ApiResponse({ status: 200, description: 'Logout successful' })
    async logout(): Promise<{ message: string }> {
        return {
            message:
                'Logged out successfully. Please remove token from client.',
        };
    }
}
