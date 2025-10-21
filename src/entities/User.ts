import {Column, Entity, PrimaryGeneratedColumn,CreateDateColumn,UpdateDateColumn, ManyToOne, OneToOne } from 'typeorm'
import { Mentors } from './Mentor';
import { Candidate } from './Candidate';

// export enum UserRole {
//       ADMIN = "admin",
//       EDITOR = "editor",
//       STUDENT = "student",
//     }

@Entity({name:"users"})
    export class User {
        @PrimaryGeneratedColumn()
        user_id!:number;

        @Column({type:'nvarchar',length:50,nullable:true})
        user_name!: string;

        @Column({type:'nvarchar',length:50,unique:true})
        email!: string;

        // @Column({type:'nvarchar',length:50,nullable:true})
        // password_hash!: string;

        @Column({type:'nvarchar',length:50,nullable:true})
        role!:string;

        @Column()
        auth0Id!:string;

        @Column({default:true})
        isActive?:boolean;

        @OneToOne( () => Mentors, (mentor)=> mentor.user )
        mentor! : Mentors ;

        @OneToOne( () => Candidate, (candidate)=> candidate.user )
        candidate! : Candidate ;

        @CreateDateColumn()
        created_at!: Date;

        @UpdateDateColumn()
        updated_at! : Date;

    }
