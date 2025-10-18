import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HealthResponseDto } from './common/dto/health-response.dto';

@Injectable()
export class AppService {
    constructor(
        @InjectDataSource()
        private dataSource: DataSource
    ) {}

    async getHello(): Promise<HealthResponseDto> {
        const isConnected = this.dataSource.isInitialized;

        return {
            message: 'Vinyl Store API',
            status: 'running',
            database: isConnected ? 'connected' : 'disconnected',
            timestamp: new Date().toISOString(),
        };
    }
}
