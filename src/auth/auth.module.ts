import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { GoogleStrategy } from './strategies/google.strategy';
import { JwtStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { TokenBlacklistService } from './token-blacklist.service';

@Module({
    imports: [
        UsersModule,

        PassportModule.register({ defaultStrategy: 'jwt' }),

        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: async (configService: ConfigService) => {
                const secret = configService.get<string>('JWT_SECRET');

                if (!secret) {
                    throw new Error(
                        'JWT_SECRET is not defined in environment variables'
                    );
                }

                return {
                    secret,
                    signOptions: {
                        expiresIn: '7d',
                    },
                };
            },
        }),
    ],
    providers: [
        AuthService,
        GoogleStrategy,
        JwtStrategy,
        TokenBlacklistService,
    ],
    controllers: [AuthController],
    exports: [AuthService], //just in case
})
export class AuthModule {}
