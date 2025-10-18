import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
            envFilePath: '.env',
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
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
