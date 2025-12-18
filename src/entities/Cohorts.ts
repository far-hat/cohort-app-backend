import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { Course } from "./Courses";
import { Enrollment } from "./CohortEnrollment";

export enum CohortStatus{
    SCHEDULED = "scheduled",
    ACTIVE= "active",
    COMPLETED = "completed",
    CANCELLED = "cancelled"
}

@Entity({name :"cohorts"})
export class Cohort
{
    @PrimaryGeneratedColumn()
    cohort_id! : number;

    @Column({type:'nvarchar', length: 100, nullable:false})
    cohort_name! : string;

    @Column({type: 'nvarchar', length:10, default: CohortStatus.SCHEDULED})
    status! : CohortStatus;

    @Column({type : "datetime", nullable:true})
    start_date? : Date;

    @Column({type:"datetime",nullable : true})
    end_date? : Date;

    @CreateDateColumn()
    created_at! : Date;

    @CreateDateColumn()
    updated_at! : Date;

    @ManyToOne(()=> Course, (course) => course.cohorts)
    @JoinColumn({name: "course_id"})
    course! : Course

    @OneToMany( ()=> Enrollment, (enrollment)=> enrollment.cohort)
    enrollments! : Enrollment[];
}