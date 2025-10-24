import { Controller, Get, Req, UseGuards, Post } from '@nestjs/common';
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
import { TokenBlacklistService } from './token-blacklist.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService, private readonly tokenBlacklistService:TokenBlacklistService) {}

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

    @Post('logout')  // Change from @Get to @Post
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Logout and invalidate token',
        description: 'Adds current token to blacklist',
    })
    @ApiResponse({ status: 200, description: 'Logout successful' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    async logout(@Req() request: Request): Promise<{ message: string }> {
        const authHeader = request.headers['authorization'] as string;
        const token = authHeader?.split(' ')[1];

        if (token) {
            this.tokenBlacklistService.addToBlacklist(token);
        }

        return {
            message: 'Logged out successfully. Token has been invalidated.',
        };
}
}
