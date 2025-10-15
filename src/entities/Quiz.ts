import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Questions } from "./Questions";
import { Mentors } from "./Mentor";

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
    status!: string;

    @Column({ type: 'datetime', nullable: true })
    start_datetime!: Date;

    @Column({ type: 'datetime', nullable: true })
    end_datetime!: Date;


    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    
    @OneToMany( ()=> Questions, (question)=> question.quiz , {cascade:true, onDelete : 'CASCADE'})
    questions!:Questions[];

    @ManyToOne(() => Mentors, (mentor) => mentor.quizzes)
    @JoinColumn({ name: "mentor_id" }) 
    mentor!: Mentors; 

}