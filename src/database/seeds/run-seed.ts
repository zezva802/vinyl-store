import { AppDataSource } from '../typeorm.config';
import { seedVinyls } from './vinyl-seeder';

async function runSeed(): Promise<void> {
    try {
        // eslint-disable-next-line no-console
        console.log('Connecting to database...');
        await AppDataSource.initialize();
        // eslint-disable-next-line no-console
        console.log('Database connected!');

        await seedVinyls(AppDataSource);
        // eslint-disable-next-line no-console
        console.log('Seeding complete!');
        await AppDataSource.destroy();
        process.exit(0);
    } catch (error) {
        console.error('Seeding failed:', error);
        process.exit(1);
    }
}

void runSeed();
