import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { Cohort } from "./Cohorts";
import { User } from "./User";

export enum EnrollmentStatus{
    ACTIVE = "active",
    REMOVED = "removed"
}

@Entity({name:"enrollments"})
export class Enrollment{
    @PrimaryGeneratedColumn()
    enrollment_id! :number;

    @Column({type: 'nvarchar',length : 10, default: EnrollmentStatus.ACTIVE})
    enrollment_status! : EnrollmentStatus;

    @ManyToOne(()=> Cohort, (cohort)=> cohort.enrollments)
    @JoinColumn({name : "cohort_id"})
    cohort! : Cohort;

    @ManyToOne(()=> User, (user)=> user.enrollments)
    @JoinColumn({name : "user_id"})
    user! : User;

    @CreateDateColumn()
    joinedAt! : Date;

}