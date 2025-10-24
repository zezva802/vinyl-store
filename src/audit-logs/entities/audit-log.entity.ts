import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    PrimaryGeneratedColumn,
} from 'typeorm';

export enum AuditAction {
    CREATE = 'create',
    UPDATE = 'update',
    DELETE = 'delete',
}

@Entity('audit_logs')
@Index(['entityType', 'entityId'])
@Index(['action'])
@Index(['performedBy'])
export class AuditLog {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    entityType: string;

    @Column({ type: 'uuid' })
    entityId: string;

    @Column({
        type: 'enum',
        enum: AuditAction,
    })
    action: AuditAction;

    @Column({ type: 'json', nullable: true })
    changes: Record<string, unknown> | null;

    @Column({ type: 'varchar' })
    performedBy: string;

    @CreateDateColumn()
    createdAt: Date;
}
