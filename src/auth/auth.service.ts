import { Injectable } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { GoogleUser } from './interfaces/google-user.interface';
import { LoginResponseDto } from './dto/login-response.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { User } from 'src/users/entities/user.entity';

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
}
