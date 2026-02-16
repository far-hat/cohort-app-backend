import AppDataSource from "../db/dataSource";
import { Quiz, QuizSessionState, QuizStatus } from "../entities/Quiz";

export class QuizSessionRepository {
  private repo = AppDataSource.getRepository(Quiz);


  async markSessionStarted(quizId: number): Promise<Quiz> {

    const now = new Date();
    const quiz = await this.repo.findOneByOrFail({ quiz_id: quizId });

    const durationMs = quiz.duration * 1000;
    quiz.session_state = QuizSessionState.ACTIVE;
    quiz.status = QuizStatus.PUBLISHED;
    quiz.start_datetime = now;
    quiz.end_datetime = new Date(now.getTime() + durationMs);
    quiz.paused_at = null;
    quiz.total_paused_ms = 0;
    return this.repo.save(quiz);
  }

  async isCandidateEligible(candidateId: number, quizId: number): Promise<boolean> {
    return true;
  }

  async getQuizById(quizId: number): Promise<Quiz> {
    return this.repo.findOneByOrFail({ quiz_id: quizId });
  }

  async markSessionPaused(quizId: number): Promise<Quiz> {
    const quiz = await this.repo.findOneByOrFail({ quiz_id: quizId });
    quiz.session_state = QuizSessionState.PAUSED;
    quiz.paused_at = new Date();
    return this.repo.save(quiz);
  }

  async markSessionResumed(quizId: number): Promise<Quiz> {
    const quiz = await this.repo.findOneByOrFail({ quiz_id: quizId });
    if (!quiz.paused_at) return quiz;

    const now = new Date();
    const pausedMs = now.getTime() - quiz.paused_at.getTime();

    quiz.session_state = QuizSessionState.ACTIVE;
    quiz.total_paused_ms! += pausedMs;
    quiz.paused_at = null;

    const durationMs = quiz.duration * 1000;
    quiz.end_datetime = new Date(
    quiz.start_datetime!.getTime() + durationMs + quiz.total_paused_ms!
  );
    return this.repo.save(quiz);
  }

  async findAllActiveQuizzes () : Promise <Quiz[]> {
    const quizzes = this.repo.find({
      where : { session_state : QuizSessionState.ACTIVE}
    });
    return quizzes;
  }

  async markSessionEnded(quizId: number): Promise<Quiz> {
    const quiz = await this.repo.findOneByOrFail({ quiz_id: quizId });
    quiz.session_state = QuizSessionState.ENDED;
    quiz.status = QuizStatus.ARCHIVED;
    quiz.end_datetime = new Date();
    return this.repo.save(quiz);
  }

  async getQuizState(quizId: number): Promise<QuizSessionState> {
    const quiz = await this.repo.findOneOrFail({
      where : { quiz_id : quizId},
      relations : ["questions", "questions.options"],
    });
    return quiz.session_state;
  }
}
