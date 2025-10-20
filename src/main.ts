import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
    const app = await NestFactory.create(AppModule, {
        rawBody: true,
    });

    const configService = app.get(ConfigService);
    const port = configService.get('PORT') ?? 3000;

    app.useGlobalPipes(
        new ValidationPipe({
            whitelist: true,
            forbidNonWhitelisted: true,
            transform: true,
        })
    );

    app.enableCors({
        origin: configService.get('FRONTEND_URL') ?? 'http://localhost:3000',
        credentials: true,
    });

    await app.listen(port);
}

bootstrap().catch((error) => {
    console.error('❌ Error starting application:', error);
    process.exit(1);
});
