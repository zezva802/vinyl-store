import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditLogsService } from 'src/audit-logs/audit-logs.service';
import { AuditAction } from 'src/audit-logs/entities/audit-log.entity';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(private readonly auditLogsService: AuditLogsService) {}

    intercept(
        context: ExecutionContext,
        next: CallHandler
    ): Observable<unknown> {
        const request = context.switchToHttp().getRequest();
        const { user, method, body, params } = request;

        if (!user) {
            return next.handle();
        }

        let action: AuditAction | null = null;
        if (method == 'POST') action = AuditAction.CREATE;
        if (method == 'PUT' || method == 'PATCH') action = AuditAction.UPDATE;
        if (method == 'DELETE') action = AuditAction.DELETE;

        if (!action) {
            return next.handle();
        }

        const controller = context.getClass();
        const entityType = this.getEntityType(controller.name);

        return next.handle().pipe(
            tap(async (result) => {
                try {
                    const entityId =
                        result?.id ?? params?.id ?? body?.id ?? 'unknown';

                    await this.auditLogsService.log({
                        entityType,
                        entityId,
                        action,
                        performedBy: user.id,
                        changes: action === AuditAction.CREATE ? body : body,
                    });
                } catch (error) {
                    console.error('Audit logging failed:', error);
                }
            })
        );
    }

    private getEntityType(controllerName: string): string {
        return controllerName.replace('Controller', '').replace('/s$/', '');
    }
}
