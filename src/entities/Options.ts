import { Column, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Questions } from "./Questions";

@Entity({name:"options"})
export class Options{
    @PrimaryGeneratedColumn()
    option_id!: number;

    @Column({
        type:'nvarchar',
        nullable:false,
        length : 500
    })
    option_text! : string;

    @Column({nullable:false})
    correct_option! : boolean;

    @ManyToOne(() => Questions, question => question.options) 
    @JoinColumn({ name: 'question_id' })
    question! : Questions;
}