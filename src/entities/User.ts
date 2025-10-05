import {Column, Entity, PrimaryGeneratedColumn,CreateDateColumn,UpdateDateColumn } from 'typeorm'

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

        @Column({type:'nvarchar',length:50,nullable:true})
        password_hash!: string;

        @Column({type:'nvarchar',length:50,nullable:true})
        role!:string;

        @Column()
        auth0Id?:string;

        @Column({default:true})
        isActive?:boolean;

        @CreateDateColumn()
        created_at!: Date;

        @UpdateDateColumn()
        updated_at! : Date;

    }
