import { Controller, Get, Req, UseGuards, Post, Body } from '@nestjs/common';
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
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly authService: AuthService,
        private readonly tokenBlacklistService: TokenBlacklistService
    ) {}

    @Post('register')
    @ApiOperation({
        summary: 'Register with email and password',
    })
    @ApiResponse({
        status: 201,
        description: 'User registered successfully',
        type: LoginResponseDto,
    })
    @ApiResponse({ status: 400, description: 'Email already exists' })
    async register(
        @Body() registerDto: RegisterDto
    ): Promise<LoginResponseDto> {
        return this.authService.register(registerDto);
    }

    @Post('login')
    @ApiOperation({
        summary: 'Login with email and password',
    })
    @ApiResponse({
        status: 200,
        description: 'Login successful',
        type: LoginResponseDto,
    })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() loginDto: LoginDto): Promise<LoginResponseDto> {
        return this.authService.login(loginDto);
    }

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

    @Post('logout')
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
        const token = authHeader.split(' ')[1];

        if (token) {
            this.tokenBlacklistService.addToBlacklist(token);
        }

        return {
            message: 'Logged out successfully. Token has been invalidated.',
        };
    }

    @Post('change-password')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth('JWT-auth')
    @ApiOperation({
        summary: 'Change password',
        description:
            'Change password for local auth users. Requires current password.',
    })
    @ApiResponse({ status: 200, description: 'Password changed successfully' })
    @ApiResponse({
        status: 400,
        description: 'Bad request (passwords do not match, OAuth user, etc.)',
    })
    @ApiResponse({ status: 401, description: 'Current password incorrect' })
    async changePassword(
        @CurrentUser() user: User,
        @Body() changePasswordDto: ChangePasswordDto
    ): Promise<{ message: string }> {
        return this.authService.changePassword(user.id, changePasswordDto);
    }
}
