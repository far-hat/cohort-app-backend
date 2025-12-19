import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "../entities/User";
import { Quiz } from "../entities/Quiz";
import { Questions } from "../entities/Questions";
import { Options } from "../entities/Options";
import { Mentors } from "../entities/Mentor";
import { Candidate } from "../entities/Candidate";
import { QuizAnswer } from "../entities/QuizAnswer";
import { QuizAttempt } from "../entities/QuizAttempt";
import { Course } from "../entities/Courses";
import { Cohort } from "../entities/Cohorts";
import { Enrollment } from "../entities/CohortEnrollment";


const AppDataSource = new DataSource({
    type:"mssql",
    host: process.env.DB_SERVER || 'localhost',
    username : process.env.DB_USER || 'sa',
    password : process.env.DB_PASSWORD || 'Server@12345',
    database : process.env.DB_DATABASE || 'CohortWebApp',
    synchronize: true, //  auto-create/alter tables
    logging: false, // Disable logging in production
    entities: [Mentors,Quiz,Questions,Options,User,Candidate,QuizAnswer,QuizAttempt,Course,Cohort,Enrollment],
    options : {
        encrypt : true,
        trustServerCertificate : true,
    },

});

export default AppDataSource;