import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "email_templates" })
export class EmailTemplate {
  @PrimaryGeneratedColumn("uuid")
    id!: string;

  @Column()
    name!: string; // Template name, e.g., "Welcome Intern"

  @Column()
    subject!: string;

  @Column({ type: "text" })
    html!: string;

  @Column({ type: "text", nullable: true })
  text?: string;

  @Column({ default: false })
    isDraft!: boolean;

  @CreateDateColumn()
    createdAt!: Date;

  @UpdateDateColumn()
    updatedAt!: Date;
}
