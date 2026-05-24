import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from '../../modules/audit/audit.service';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const method = request.method;

    return next.handle().pipe(
      tap(() => {
        if (!['POST', 'PATCH', 'DELETE'].includes(method)) {
          return;
        }

        const user = request.user;
        void this.auditService.log({
          actorId: user?.sub,
          action: `${method}:${request.route?.path ?? request.url}`,
          entity: 'HTTP',
          entityId: request.url,
          details: {
            params: request.params,
            body: request.body,
          },
          ipAddress: request.ip,
        });
      }),
    );
  }
}