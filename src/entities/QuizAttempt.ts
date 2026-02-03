// entities/QuizAttempt.ts
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, CreateDateColumn } from 'typeorm';
import { User } from './User';
import { Quiz } from './Quiz';
import { QuizAnswer } from './QuizAnswer';
import { Candidate } from './Candidate';

@Entity({ name: 'quiz_attempts' })
export class QuizAttempt {
    @PrimaryGeneratedColumn()
    attempt_id!: number;

    @ManyToOne(() => Candidate, (candidate) => candidate.quiz_attempts)
    candidate!: Candidate;

    @ManyToOne(() => Quiz, (quiz) => quiz.attempts)
    quiz!: Quiz;

    @Column({ type: 'int', default: 0 })
    score!: number;

    @Column({ type: 'int', default: 0 })
    total_questions!: number;

    @Column({ type: 'float', nullable: true })
    percentage!: number;

    @CreateDateColumn({nullable : true})
    submitted_at?: Date;

    @CreateDateColumn({nullable : true})
    created_at ? : Date;

    @OneToMany(() => QuizAnswer, (answer) => answer.attempt, { cascade: true })
    answers!: QuizAnswer[];

}