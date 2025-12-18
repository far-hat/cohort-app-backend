import {Entity,PrimaryGeneratedColumn,Column,OneToOne,JoinColumn, UpdateDateColumn, CreateDateColumn, OneToMany, ManyToOne} from 'typeorm'

import { User } from './User'
import { Quiz } from './Quiz';
import { Course } from './Courses';

@Entity("mentors")
export class Mentors{

    @PrimaryGeneratedColumn()
    mentor_id! : number;

    @Column({type:"nvarchar",length:50})
    full_name!:string;

     @Column({type:"nvarchar",length:10,nullable:true})
    phone?:string;

     @Column({type:"nvarchar",length:50,nullable:true})
    expertise?:string;

     @CreateDateColumn()
            created_at!: Date;
    
            @UpdateDateColumn()
            updated_at! : Date;

     @OneToMany(() => Quiz, (quiz) => quiz.mentor)
    quizzes!: Quiz[];
    
    @ManyToOne(() => User, (user) => user.mentor)
    @JoinColumn({ name: "user_id" }) 
    user!: User;
    
    @OneToMany(() => Course, (course) => course.mentor)
    courses!: Course[];


}