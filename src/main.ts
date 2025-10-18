import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    const configService = app.get(ConfigService);
    const port = configService.get('PORT') ?? 3000;

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
