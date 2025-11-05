import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn, UpdateDateColumn } from 'typeorm'; // CRITICAL FIX: Import UpdateDateColumn
import { User } from '../users/entities/users.entity'; // CRITICAL FIX: Import User if you want the relation

@Entity('sessions')
export class Session {
    @PrimaryGeneratedColumn() // CRITICAL FIX: Use simple number ID for session
    id!: number;

    @Column({ type: 'uuid' }) // CRITICAL FIX: userId is UUID (string)
    userId!: string;

    @Column({ nullable: false })
    token!: string;

    @Column({ nullable: true }) // Device info can be optional
    deviceInfo?: string;

    @Column({ nullable: true }) // IP address can be optional
    ipAddress?: string;

    @Column({ nullable: false })
    lastActivityAt!: Date;

    @Column({ nullable: false })
    rememberMe!: boolean;

    @Column({ nullable: false })
    expiresAt!: Date;

    // Optional: Many-to-One relation to User if you want to load user with session
    @ManyToOne(() => User, user => user.sessions, { onDelete: 'CASCADE', nullable: false })
    user!: User; // CRITICAL FIX: Must explicitly define user, and provide inverse in User entity

    @CreateDateColumn()
    createdAt!: Date;

    @UpdateDateColumn() // CRITICAL FIX: Add UpdateDateColumn
    updatedAt!: Date;
}