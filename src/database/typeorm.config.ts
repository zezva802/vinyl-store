import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

export const AppDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT ?? '3306'),
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,

    entities: ['src/**/*.entity{.ts,.js}'],

    migrations: ['src/database/migrations/*{.ts,.js}'],

    synchronize: false,

    logging: process.env.NODE_ENV === 'development',
});
