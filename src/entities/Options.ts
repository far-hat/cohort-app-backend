import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Questions } from "./Questions";

@Entity({name:"options"})
export class Options{
    @PrimaryGeneratedColumn()
    option_id!: Number;

    @Column({
        type:'nvarchar',
        nullable:false,
        length : 500
    })
    option_text! : string;

    @Column({nullable:false})
    correct_option! : boolean;
    
    @ManyToOne(() => Questions, question => question.options) 
    question! : Questions;
}