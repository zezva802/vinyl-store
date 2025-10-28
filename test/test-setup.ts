import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config({ path: '.env.test' });

export class TestSetup {
    private static dataSource: DataSource;

    static async initialize(): Promise<DataSource> {
        if (this.dataSource?.isInitialized) {
            return this.dataSource;
        }

        this.dataSource = new DataSource({
            type: 'mysql',
            host: process.env.DB_HOST || 'localhost',
            port: parseInt(process.env.DB_PORT || '3307'),
            username: process.env.DB_USERNAME || 'vinyl_user',
            password: process.env.DB_PASSWORD || 'vinyl_password',
            database: process.env.DB_DATABASE || 'vinyl_store_test',
            entities: ['src/**/*.entity.ts'],
            synchronize: false,
            logging: false,
        });

        await this.dataSource.initialize();
        return this.dataSource;
    }

    static async cleanup(): Promise<void> {
        if (!this.dataSource?.isInitialized) {
            return;
        }

        const entities = this.dataSource.entityMetadatas;

        await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 0');

        for (const entity of entities) {
            const repository = this.dataSource.getRepository(entity.name);
            await repository.query(`TRUNCATE TABLE \`${entity.tableName}\``);
        }

        await this.dataSource.query('SET FOREIGN_KEY_CHECKS = 1');
    }

    static async destroy(): Promise<void> {
        if (this.dataSource?.isInitialized) {
            await this.dataSource.destroy();
        }
    }

    static getDataSource(): DataSource {
        return this.dataSource;
    }
}

export interface TestUser {
    id: string;
    email: string;
    token: string;
    role: 'user' | 'admin';
}

export const TEST_USERS = {
    admin: {
        email: 'admin@test.com',
        password: 'AdminPass123!',
        firstName: 'Admin',
        lastName: 'User',
    },
    user1: {
        email: 'user1@test.com',
        password: 'UserPass123!',
        firstName: 'Test',
        lastName: 'User',
    },
    user2: {
        email: 'user2@test.com',
        password: 'UserPass123!',
        firstName: 'Another',
        lastName: 'User',
    },
};

export const API_BASE_URL = `http://localhost:${process.env.PORT || 3000}`;