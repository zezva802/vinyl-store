import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { GoogleUser } from './interfaces/google-user.interface';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from 'src/users/entities/user.entity';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ChangePasswordDto } from './dto/change-password.dto';

@Injectable()
export class AuthService {
    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService
    ) {}

    async googleLogin(googleUser: GoogleUser): Promise<LoginResponseDto> {
        let user = await this.usersService.findByGoogleId(googleUser.googleId);

        if (user) {
            user = await this.usersService.updateFromGoogle(user, googleUser);
        } else {
            user = await this.usersService.createFromGoogle(googleUser);
        }

        const accessToken = this.generateJwtToken(user);

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                role: user.role,
            },
        };
    }

    private generateJwtToken(user: User): string {
        const payload: JwtPayload = {
            sub: user.id,
            email: user.email,
            role: user.role,
        };

        return this.jwtService.sign(payload);
    }

    async validateUser(payload: JwtPayload): Promise<User | null> {
        return this.usersService.findById(payload.sub);
    }

    async register(registerDto: RegisterDto): Promise<LoginResponseDto> {
        const { email, password, firstName, lastName } = registerDto;

        const existingUser = await this.usersService.findByEmail(email);
        if (existingUser) {
            throw new BadRequestException('Email already exists');
        }

        const user = await this.usersService.createLocal(
            email,
            password,
            firstName,
            lastName
        );

        const accessToken = this.generateJwtToken(user);

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                role: user.role,
            },
        };
    }

    async login(loginDto: LoginDto): Promise<LoginResponseDto> {
        const { email, password } = loginDto;

        const user = await this.usersService.findByEmailWithPassword(email);

        if (!user) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const isPasswordValid = await this.usersService.validatePassword(
            user,
            password
        );

        if (!isPasswordValid) {
            throw new UnauthorizedException('Invalid credentials');
        }

        const accessToken = this.generateJwtToken(user);

        return {
            accessToken,
            user: {
                id: user.id,
                email: user.email,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                role: user.role,
            },
        };
    }

    async changePassword(
        userId: string,
        changePasswordDto: ChangePasswordDto
    ): Promise<{ message: string }> {
        const { currentPassword, newPassword, confirmPassword } =
            changePasswordDto;

        if (newPassword !== confirmPassword) {
            throw new BadRequestException('New passwords do not match');
        }

        if (currentPassword === newPassword) {
            throw new BadRequestException(
                'New password must be different from current password'
            );
        }

        await this.usersService.changePassword(
            userId,
            currentPassword,
            newPassword
        );

        return {
            message: 'Password changed successfully',
        };
    }
}
