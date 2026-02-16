import { Quiz } from "../entities/Quiz";
import { AttemptState, QuizAttempt } from "../entities/QuizAttempt";
import { User } from "../entities/User";

export interface MentorSnapshot {
  totalCandidates: number;
  candidates: {
    attemptId: number;
    candidateId: number;
    name: string;
    state: AttemptState;
    score: number;
    progressPercent: number;
    joinedAt: Date | undefined;
    submittedAt: Date | undefined;
  }[];
}



export interface AttemptService {
  getAttemptWithQuiz(attemptId : number) :Promise<QuizAttempt>
  createOrRestoreAttempt(user: User, quiz: Quiz): Promise<QuizAttempt>;
  markConnected(attemptId: number, socketId: string): Promise<void>;
  markDisconnected(attemptId: number): Promise<void>;
  getMentorSnapshot(quizId : number, sessionStart : Date) : Promise<MentorSnapshot>;
}
