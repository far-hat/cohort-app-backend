import {Entity,PrimaryGeneratedColumn,Column,OneToOne,JoinColumn, UpdateDateColumn, CreateDateColumn, OneToMany} from 'typeorm'

import { User } from './User'
import { QuizAttempt } from './QuizAttempt';

@Entity("candidates")
export class Candidate{

    @PrimaryGeneratedColumn()
    candidate_id! : number;

    @OneToOne( ()=> User, {nullable : false})
    @JoinColumn({name:"user_id"})
    user!:User;

    @Column({type:"nvarchar",length:50})
    full_name!:string;

     @Column({type:"nvarchar",length:10,nullable:true})
    phone?:string;

     @Column({type:"nvarchar",length:50,nullable:true})
    education_level?:string;

     @CreateDateColumn()
            created_at!: Date;
    
            @UpdateDateColumn()
            updated_at! : Date;
    @OneToMany(() => QuizAttempt, (attempt) => attempt.candidate)
    quiz_attempts!: QuizAttempt[];

}