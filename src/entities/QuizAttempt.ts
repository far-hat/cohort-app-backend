// entities/QuizAttempt.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from './User';
import { Quiz } from './Quiz';
import { QuizAnswer } from './QuizAnswer';

@Entity({ name: 'quiz_attempts' })
export class QuizAttempt {
    @PrimaryGeneratedColumn()
    attempt_id!: number;

    @ManyToOne(() => User, (user) => user.quiz_attempts)
    user!: User;

    @ManyToOne(() => Quiz, (quiz) => quiz.attempts)
    quiz!: Quiz;

    @Column({ type: 'int', default: 0 })
    score!: number;

    @Column({ type: 'int', default: 0 })
    total_questions!: number;

    @Column({ type: 'float', nullable: true })
    percentage!: number;

    @CreateDateColumn()
    submitted_at!: Date;

    @OneToMany(() => QuizAnswer, (answer) => answer.attempt, { cascade: true })
    answers!: QuizAnswer[];
}