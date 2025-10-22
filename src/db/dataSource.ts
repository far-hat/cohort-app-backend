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


const AppDataSource = new DataSource({
    type:"mssql",
    host: process.env.DB_SERVER!,
    username : process.env.DB_USER!,
    password : process.env.DB_PASSWORD!,
    database : process.env.DB_DATABASE!,
    synchronize: true, //  auto-create/alter tables
    logging: true,
    entities: [Mentors,Quiz,Questions,Options,User,Candidate,QuizAnswer,QuizAttempt],
    options : {
        encrypt : true,
        trustServerCertificate : true,
    },

});

export default AppDataSource;