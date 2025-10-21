import {
    Column,
    Entity,
    JoinColumn,
    ManyToOne,
    PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';
import { Vinyl } from '../../vinyls/entities/vinyl.entity';

@Entity('order_items')
export class OrderItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ default: 1 })
    quantity: number;

    @Column({ type: 'decimal', precision: 10, scale: 2 })
    priceAtPurchase: number;

    @Column()
    orderId: string;

    @Column()
    vinylId: string;

    @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'orderId' })
    order: Order;

    @ManyToOne(() => Vinyl, (vinyl) => vinyl.orderItems, {
        onDelete: 'RESTRICT',
    })
    @JoinColumn({ name: 'vinylId' })
    vinyl: Vinyl;
}
