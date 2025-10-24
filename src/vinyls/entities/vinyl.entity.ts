import {
    Column,
    CreateDateColumn,
    Entity,
    Index,
    OneToMany,
    PrimaryGeneratedColumn,
    UpdateDateColumn,
} from 'typeorm';
import { Review } from '../../reviews/entities/review.entity';
import { OrderItem } from '../../orders/entities/order-item.entity';

@Entity('vinyls')
export class Vinyl {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar' })
    @Index()
    name: string;

    @Column({ type: 'varchar' })
    @Index()
    authorName: string;

    @Column({ type: 'text' })
    description: string;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    price: number;

    @Column({ type: 'text', nullable: true })
    imageUrl: string;

    @Column({ type: 'boolean', default: false })
    isDeleted: boolean;

    @CreateDateColumn()
    createdAt: Date;

    @UpdateDateColumn()
    updatedAt: Date;

    @OneToMany(() => Review, (review) => review.vinyl)
    reviews: Review[];

    @OneToMany(() => OrderItem, (orderItem) => orderItem.vinyl)
    orderItems: OrderItem[];
}
