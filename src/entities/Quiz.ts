import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Questions } from "./Questions";
import { Mentors } from "./Mentor";
import { QuizAttempt } from "./QuizAttempt";


@Entity({ name: "quiz" })
export class Quiz {
    @PrimaryGeneratedColumn()
    quiz_id!: number;

    @Column({
        type: 'nvarchar',
        length: 100,
        nullable: false,
    })
    course_name!: string;

    @Column({
        type: 'nvarchar',
        length: 500,
        nullable: true,
    })
    quiz_description!: string;

    @Column({
        type: 'nvarchar',
        length: 50,
        nullable: true,
    })
    status!: string;// can be draft, published or archived

    //real-time session status field
    @Column({
        type : "varchar",
        length: 20,
        default : "scheduled"
    })
    session_state! : string; // can be scheduled,inactive , active, paused, ended.
 
    @Column({
        type: 'datetime',
        nullable : true
    })
    scheduled_start! : Date;

    @Column({ type: 'datetime', nullable: true })
    start_datetime!: Date;

    @Column({ type: 'datetime', nullable: true })
    end_datetime!: Date;

    @Column({
        type : 'int',
        nullable :true
    })
    duration! : number;


    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    
    @OneToMany( ()=> Questions, (question)=> question.quiz , {cascade:true, onDelete : 'CASCADE'})
    questions!:Questions[];

    @ManyToOne(() => Mentors, (mentor) => mentor.quizzes)
    @JoinColumn({ name: "mentor_id" }) 
    mentor!: Mentors; 

    @OneToMany(() => QuizAttempt, (attempt) => attempt.quiz)
    attempts!: QuizAttempt[];

    isActive() : boolean{
        return this.session_state === 'active' || this.session_state === 'paused';
    }

    isScheduled() : boolean{
        return this.session_state === 'scheduled'
    }

    canStart() : boolean{
        return ['draft','scheduled'].includes(this.session_state);
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