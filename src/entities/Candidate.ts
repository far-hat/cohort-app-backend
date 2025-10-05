import {Entity,PrimaryGeneratedColumn,Column,OneToOne,JoinColumn, UpdateDateColumn, CreateDateColumn} from 'typeorm'

import { User } from './User'

@Entity("candidates")
export class Candidate{

    @PrimaryGeneratedColumn()
    candidate_id! : number;

    @OneToOne( ()=> User)
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
    

}