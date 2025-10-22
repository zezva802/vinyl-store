import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { AuditAction, AuditLog } from './entities/audit-log.entity';
import { Repository } from 'typeorm';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { PaginatedAuditLogs } from './interfaces/paginated-audit-logs.interface';

@Injectable()
export class AuditLogsService {
    constructor(
        @InjectRepository(AuditLog)
        private readonly auditLogRepository: Repository<AuditLog>
    ) {}

    async log(data: {
        entityType: string;
        entityId: string;
        action: AuditAction;
        performedBy: string;
        changes?: Record<string, unknown>;
    }): Promise<AuditLog> {
        const auditLog = this.auditLogRepository.create(data);
        return this.auditLogRepository.save(auditLog);
    }

    async findAll(query: QueryAuditLogDto): Promise<PaginatedAuditLogs> {
        const {
            page = 1,
            limit = 50,
            entityType,
            entityId,
            action,
            performedBy,
        } = query;

        const queryBuilder = this.auditLogRepository
            .createQueryBuilder('audit_log')
            .orderBy('audit_log.createdAt', 'DESC');

        if (entityType) {
            queryBuilder.andWhere('audit_log.entityType = :entityType', {
                entityId,
            });
        }

        if (action) {
            queryBuilder.andWhere('audit_log.action = :action', { action });
        }

        if (performedBy) {
            queryBuilder.andWhere('audit_log.performedBy = :performedBy', {
                performedBy,
            });
        }

        queryBuilder.skip((page - 1) * limit).take(limit);

        const [data, total] = await queryBuilder.getManyAndCount();

        return {
            data,
            total,
            page,
            limit,
            totalPages: Math.ceil(total / limit),
        };
    }

    async getEntityHistory(
        entityType: string,
        entityId: string
    ): Promise<AuditLog[]> {
        return this.auditLogRepository.find({
            where: { entityType, entityId },
            order: { createdAt: 'DESC' },
        });
    }

    async getUserActivity(userId: string): Promise<AuditLog[]> {
        return this.auditLogRepository.find({
            where: { performedBy: userId },
            order: { createdAt: 'DESC' },
            take: 100,
        });
    }
}
