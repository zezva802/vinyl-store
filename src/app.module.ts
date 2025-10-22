import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { VinylsModule } from './vinyls/vinyls.module';
import { ReviewsModule } from './reviews/reviews.module';
import { OrdersModule } from './orders/orders.module';
import { AuditLogsModule } from './audit-logs/audit-logs.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: process.env.NODE_ENV === 'test' ? '.env.test' : '.env',
        }),

        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                type: 'mysql',
                host: configService.get('DB_HOST'),
                port: configService.get('DB_PORT'),
                username: configService.get('DB_USERNAME'),
                password: configService.get('DB_PASSWORD'),
                database: configService.get('DB_DATABASE'),

                entities: [__dirname + '/**/*.entity{.ts,.js}'],

                synchronize: false,

                logging: configService.get('NODE_ENV') === 'development',

                migrations: [__dirname + '/database/migrations/*{.ts,.js}'],
                migrationsRun: false,
            }),
        }),

        AuthModule,

        UsersModule,

        VinylsModule,

        ReviewsModule,

        OrdersModule,

        AuditLogsModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
