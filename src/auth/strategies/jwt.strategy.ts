import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from '../auth.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { User } from 'src/users/entities/user.entity';
import { TokenBlacklistService } from '../token-blacklist.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
    constructor(
        private configService: ConfigService,
        private authService: AuthService,
        private tokenBlacklistService: TokenBlacklistService
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET')!,
            passReqToCallback: true,
        });
    }

    async validate(request: Request, payload: JwtPayload): Promise<User> {
        const authHeader = request.headers['authorization'] as string;
        const token = authHeader.split(' ')[1];

        if (token && this.tokenBlacklistService.isBlacklisted(token)) {
            throw new UnauthorizedException('Token has been revoked');
        }

        const user = await this.authService.validateUser(payload);

        if (!user) {
            throw new UnauthorizedException(
                'User not found or account deleted'
            );
        }

        return user;
    }
}
