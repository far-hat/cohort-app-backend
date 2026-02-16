import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Questions } from "./Questions";
import { Mentors } from "./Mentor";
import { QuizAttempt } from "./QuizAttempt";


export enum QuizStatus {
    DRAFT = "draft",
    PUBLISHED = "published",
    ARCHIVED = "archived"
}

export enum QuizSessionState {
    SCHEDULED = "scheduled",
    ACTIVE = "active",
    PAUSED = "paused",
    ENDED = "ended"
}


@Entity({ name: "quiz" })
export class Quiz {
    @PrimaryGeneratedColumn()
    quiz_id!: number;

    @Column({
        type: 'nvarchar',
        length: 100,
        nullable: false,
    })
    quiz_name!: string;

    @Column({
        type: 'nvarchar',
        length: 500,
        nullable: true,
    })
    quiz_description!: string;

    @Column({ type: "varchar", length: 20, default: QuizStatus.DRAFT })
    status!: QuizStatus;

    @Column({ type: "varchar", length: 20, default: QuizSessionState.SCHEDULED })
    session_state!: QuizSessionState;


    @Column({
        type: 'datetime',
        nullable: true
    })
    scheduled_start!: Date;

    @Column({ type: 'datetime', nullable: true })
    start_datetime!: Date;

    @Column({ type: 'datetime', nullable: true })
    end_datetime?: Date | null;

    @Column({ type: "datetime", nullable: true })
    paused_at?: Date | null;

    @Column({
        type: 'int',
        nullable: true
    })
    duration!: number;

    @Column({
        type: 'int',
        nullable: true
    })
    total_paused_ms?: number;


    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;


    @OneToMany(() => Questions, (question) => question.quiz, { cascade: true, onDelete: 'CASCADE' })
    questions!: Questions[];

    @ManyToOne(() => Mentors, (mentor) => mentor.quizzes)
    @JoinColumn({ name: "mentor_id" })
    mentor!: Mentors;

    @OneToMany(() => QuizAttempt, (attempt) => attempt.quiz)
    attempts!: QuizAttempt[];

    isActive(): boolean {
        return this.session_state === 'active' || this.session_state === 'paused';
    }

    isScheduled(): boolean {
        return this.session_state === 'scheduled'
    }

    canStart(): boolean {
        return ['scheduled', 'ended'].includes(this.session_state);
    }

    canPause(): boolean {
        return this.session_state === 'active';
    }

    canResume(): boolean {
        return this.session_state === 'paused';
    }

    canStop(): boolean {
        return ['active', 'paused'].includes(this.session_state);
    }

}