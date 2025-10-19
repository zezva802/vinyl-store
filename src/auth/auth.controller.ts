import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { GoogleAuthGuard } from './guards/google-auth.guard';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../users/entities/user.entity';
import { LoginResponseDto } from './dto/login-response.dto';

@Controller('auth')
export class AuthController {
    constructor(private readonly authService: AuthService) {}

    @Get('google')
    @UseGuards(GoogleAuthGuard)
    async googleAuth(): Promise<void> {}

    /**
     * Note: Using 'any' for req type due to Passport's dynamic user attachment.
     * In production, would extend Express Request interface with GoogleUser type.
     * Isolated to this single callback - all other endpoints use @CurrentUser() decorator.
     */
    @Get('google/callback')
    @UseGuards(GoogleAuthGuard)
    // eslint-disable-next-line
    async googleAuthCallback(@Req() req: any): Promise<LoginResponseDto> {
        return this.authService.googleLogin(req.login);
    }

    @Get('me')
    @UseGuards(JwtAuthGuard)
    async getMe(@CurrentUser() user: User): Promise<User> {
        return user;
    }

    @Get('logout')
    async logout(): Promise<{ message: string }> {
        return {
            message:
                'Logged out successfully. Please remove token from client.',
        };
    }
}
