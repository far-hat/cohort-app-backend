import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import { Mentors } from "./Mentor";
import { Cohort } from "./Cohorts";
export enum CourseStatus{
    DRAFT = "draft",
    PUBLISHED = "published",
    ARCHIVED = "archived"
}

@Entity({name : "courses"})
    export class Course {
        @PrimaryGeneratedColumn()
        course_id! : number;

        @Column( {type: 'nvarchar', length : 100, nullable:false})
        course_title! : string;

        @Column({type:'nvarchar', length:200, nullable : true})
        description? : string;

        @Column({type : 'nvarchar', length : 20, nullable : false, default: CourseStatus.DRAFT})
        status! : CourseStatus;

        @CreateDateColumn()
        created_at! : Date;

        @UpdateDateColumn()
        updated_at! :Date;

        @ManyToOne( ()=> Mentors, (mentor)=> mentor.courses )
        @JoinColumn({name: 'mentor_id'})
        mentor! : Mentors;

        @OneToMany(() => Cohort, (cohort) => cohort.course)
        cohorts!: Cohort[];
        
    }