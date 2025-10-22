import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuditLogsService } from './audit-logs.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { QueryAuditLogDto } from './dto/query-audit-log.dto';
import { PaginatedAuditLogs } from './interfaces/paginated-audit-logs.interface';
import {
    ApiTags,
    ApiBearerAuth,
    ApiOperation,
    ApiResponse,
} from '@nestjs/swagger';

@ApiTags('audit-logs')
@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@ApiBearerAuth('JWT-auth')
export class AuditLogsController {
    constructor(private readonly auditLogsService: AuditLogsService) {}

    @Get()
    @ApiOperation({
        summary: 'Get system audit logs (Admin only)',
        description: 'Returns paginated audit logs with filtering options',
    })
    @ApiResponse({ status: 200, description: 'Returns audit logs' })
    @ApiResponse({ status: 401, description: 'Unauthorized' })
    @ApiResponse({ status: 403, description: 'Forbidden - Admin only' })
    async findAll(
        @Query() query: QueryAuditLogDto
    ): Promise<PaginatedAuditLogs> {
        return this.auditLogsService.findAll(query);
    }
}
