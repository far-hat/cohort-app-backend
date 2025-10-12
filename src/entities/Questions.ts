import { Column, Entity, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Quiz } from "./Quiz";
import { Options } from "./Options";

@Entity({ name: "questions" })

export class Questions {
    @PrimaryGeneratedColumn()
    question_id!: number;

    @Column({
        type: 'nvarchar',
        nullable: false,
        length: 500
    })
    question_text!: string;

    @ManyToOne(() => Quiz, quiz => quiz.questions) quiz!: Quiz;

    @OneToMany(() => Options, option => option.question) options!: Options[];



}