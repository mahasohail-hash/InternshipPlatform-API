// src/entities/session.entity.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, CreateDateColumn } from 'typeorm';
// Assuming User entity path is correct
// import { User } from './user.entity'; 

@Entity('sessions')
export class Session {
    // FIX 1: Use @PrimaryGeneratedColumn for properties that TypeORM assigns
    @PrimaryGeneratedColumn()
    id!: number; // Fixed TS2564

    @Column({ type: 'uuid' })
    userId!: string; // Fixed TS2564

    @Column()
    token!: string; // Fixed TS2564

    @Column()
    deviceInfo!: string; // Fixed TS2564

    @Column()
    ipAddress!: string; // Fixed TS2564

    @Column()
    lastActivityAt!: Date; // Fixed TS2564

    @Column()
    rememberMe!: boolean; // Fixed TS2564

    @Column()
    expiresAt!: Date; // Fixed TS2564

    // FIX 2: If 'user' is a relation, it's defined by TypeORM. Use '!' or initialize to `undefined`
    // Assuming User entity is correctly imported and linked via foreign key
    // @ManyToOne(() => User, user => user.sessions)
    // user!: User; // Fixed TS2564

    // FIX 3: Use @CreateDateColumn for automatic timestamping
    @CreateDateColumn()
    createdAt!: Date; // Fixed TS2564
}