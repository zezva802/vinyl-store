import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { PaginatedAuditLogs } from './interfaces/paginated-audit-logs.interface';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AuditLogsController {
    constructor(private readonly auditLogsService: AuditLogsService) {}

    @Get()
    async findAll(
        @Query() query: QueryAuditLogDto
    ): Promise<PaginatedAuditLogs> {
        return this.auditLogsService.findAll(query);
    }
}
