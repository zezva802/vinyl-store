import {
    Column,
    CreateDateColumn,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Vinyl } from '../../vinyls/entities/vinyl.entity';

@Entity('reviews')
@Index(['vinylId', 'isDeleted'])
@Index(['userId', 'isDeleted'])
export class Review {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'text' })
    comment: string;

    @Column({ type: 'tinyint', unsigned: true })
    score: number;

    @Column({ default: false })
    isDeleted: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @Column()
    userId: string;

    @Column()
    vinylId: string;

    @ManyToOne(() => User, (user) => user.reviews, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'userId' })
    user: User;

    @ManyToOne(() => Vinyl, (vinyl) => vinyl.reviews, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'vinylId' })
    vinyl: Vinyl;
}
