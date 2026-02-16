import { AttemptRepository } from "../repository/attemptRepository";
import { QuizSessionRepository } from "../repository/quizSessionRepository";
import { redis } from "../redis/redisClient";
import { QuizSessionState } from "../entities/Quiz";
import { User } from "../entities/User";
import { Quiz } from "../entities/Quiz";
import { QuizAttempt, AttemptState } from "../entities/QuizAttempt";
import { MentorSnapshot } from "./attemptService";

export class AttemptServiceImpl {
  constructor(
    private attemptRepo: AttemptRepository,
    private quizRepo: QuizSessionRepository
  ) { }

  async getAttemptWithQuiz(attemptId: number): Promise<QuizAttempt> {
    return this.attemptRepo.getQuizAttempt(attemptId);
  }


  async createOrRestoreAttempt(user: User, quiz: Quiz): Promise<QuizAttempt> {
    const sessionState = await this.quizRepo.getQuizState(quiz.quiz_id);
    if (![QuizSessionState.ACTIVE, QuizSessionState.PAUSED].includes(sessionState)) {
      throw new Error("Quiz is not joinable at this time");
    }

    if (!user.candidate) {
      throw new Error("Only candidates may join quizzes");
    }

    const isEligible = await this.quizRepo.isCandidateEligible(
      user.candidate.candidate_id,
      quiz.quiz_id
    );

    if (!isEligible) {
      throw new Error("Candidate is not eligible for this quiz");
    }

    const existing =
      await this.attemptRepo.findLatestByCandidateAndQuizForSession(
        user.candidate.candidate_id,
        quiz.quiz_id,
        quiz.start_datetime!
      );

      console.log(user);
      console.log(user.candidate);

    if (existing && existing.submitted_at) {
      throw new Error("Attempt already submitted");
    }

    if (existing) {
      await this.cacheAttempt(existing);
      return existing;
    }

    const attempt = await this.attemptRepo.createAttempt({
      candidate: user.candidate,
      quiz,
      total_questions: quiz.questions?.length ?? 0,
      state: AttemptState.IN_PROGRESS
    });

    await this.cacheAttempt(attempt);
    return attempt;
  }

  async getMentorSnapshot(quizId: number,sessionStart : Date): Promise<MentorSnapshot> {
    return this.attemptRepo.getMentorSnapshot(quizId,sessionStart);

  }


  async markConnected(attemptId: number, socketId: string): Promise<void> {
    await redis.hset(`attempt:${attemptId}`, {
      connected: "true",
      socketId,
      lastSeen: Date.now().toString()
    });
  }

  async markDisconnected(attemptId: number): Promise<void> {
    await redis.hset(`attempt:${attemptId}`, {
      connected: "false",
      lastSeen: Date.now().toString()
    });
  }

  private async cacheAttempt(attempt: QuizAttempt) {
    if (!attempt.candidate?.user) {
      throw new Error("Candidate user relation missing");
    }

    await redis.hset(`attempt:${attempt.attempt_id}`, {
      state: AttemptState.IN_PROGRESS,
      userId: attempt.candidate.user.auth0Id,
      quizId: attempt.quiz.quiz_id.toString()
    });

    await redis.sadd(
      `quiz:${attempt.quiz.quiz_id}:attempts`,
      attempt.attempt_id.toString()
    );
  }
}
