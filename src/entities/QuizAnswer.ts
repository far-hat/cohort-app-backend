
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne } from 'typeorm';
import { QuizAttempt } from './QuizAttempt';
import { Questions } from './Questions';
import { Options } from './Options';

@Entity({ name: 'quiz_answers' })
export class QuizAnswer {
    @PrimaryGeneratedColumn()
    answer_id!: number;

    @ManyToOne(() => QuizAttempt, (attempt) => attempt.answers)
    attempt!: QuizAttempt;

    @ManyToOne(() => Questions)
    question!: Questions;

    @ManyToOne(() => Options, { nullable: true })
    selected_option!: Options;

    @Column({ default:false })
    is_correct!: boolean;

    @Column({ type: 'text', nullable: true })
    user_answer_text!: string; 
}