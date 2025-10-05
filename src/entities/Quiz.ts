import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Questions } from "./Questions";

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

    @Column({ type: 'datetime', nullable: true })
    start_datetime!: Date;

    @Column({ type: 'datetime', nullable: true })
    end_datetime!: Date;


    @CreateDateColumn()
    created_at!: Date;

    @UpdateDateColumn()
    updated_at!: Date;

    @OneToMany( ()=> Questions, (question)=> question.quiz , {cascade:true})
    questions!:Questions[];
}