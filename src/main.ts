import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

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

    const config = new DocumentBuilder()
        .setTitle('Vinyl Store API')
        .setDescription(
            'An API for managing a vintl records store with autenthication'
        )
        .setVersion('1.0')
        .addTag('auth', 'Authentication endpoints (Google OAuth)')
        .addTag('vinyls', 'Vinyl records management')
        .addTag('reviews', 'Product reviews and ratings')
        .addTag('orders', 'Order and payment processing')
        .addTag('users', 'User profile management')
        .addTag('audit-logs', 'System audit logs (Admin only)')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
                description:
                    'Enter JWT token obtained from /auth/google/callback',
            },
            'JWT-auth'
        )
        .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api', app, document);

    await app.listen(port);

    //eslint-disable-next-line
    console.log(`
    Vinyl Store API is running!
    
    Server: http://localhost:${port}
    Swagger: http://localhost:${port}/api
    Auth: http://localhost:${port}/auth/google
    
    `);
}

bootstrap().catch((error) => {
    console.error('❌ Error starting application:', error);
    process.exit(1);
});
