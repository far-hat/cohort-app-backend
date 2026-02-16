import { Column, CreateDateColumn, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Candidate } from "./Candidate";
import { Quiz } from "./Quiz";
import { QuizAnswer } from "./QuizAnswer";

export enum AttemptState {
  CREATED = "created",
  IN_PROGRESS = "in_progress",
  SUBMITTED = "submitted",
  AUTO_SUBMITTED = "auto_submitted"
}

@Entity({ name: "quiz_attempts" })
export class QuizAttempt {
  @PrimaryGeneratedColumn()
  attempt_id!: number;

  @ManyToOne(() => Candidate, (candidate) => candidate.quiz_attempts)
  candidate!: Candidate;

  @ManyToOne(() => Quiz, (quiz) => quiz.attempts)
  quiz!: Quiz;

  @Column({ type: "varchar", length: 20, default: AttemptState.CREATED })
  state!: AttemptState;

  @Column({ type: 'int', default: 0 })
  score!: number;

  @Column({ type: 'int', default: 0 })
  total_questions!: number;

  @Column({ type: 'float', nullable: true })
  percentage!: number;

  @CreateDateColumn({nullable : true})
  created_at?: Date;

  @Column({ type: "datetime", nullable: true })
  submitted_at?: Date;

  @OneToMany(() => QuizAnswer, (answer) => answer.attempt, { cascade: true })
  answers!: QuizAnswer[];
}
