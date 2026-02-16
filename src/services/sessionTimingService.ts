import { QuizSessionState } from "../entities/Quiz";
import { QuizSessionRepository } from "../repository/quizSessionRepository";
import { QuizScheduler } from "./quizScheduler";
import { QuizTimeoutHandler } from "./quizTimeoutHandler";

type TimerMeta = {
  timeout?: NodeJS.Timeout;
  interval?: NodeJS.Timeout;
  endAt: number;
};

export class SessionTimingService {
  private timers = new Map<number, TimerMeta>();

  constructor() { }

  async recoverTimer(
    quizId: number,
    endDatetime: Date,
    handler: QuizTimeoutHandler
  ): Promise<void> {
    const remainingMs = endDatetime.getTime() - Date.now();

    if (remainingMs <= 0) {
      await handler.onQuizTimeout(quizId);
      return;
    }

    await this.initializeTimer(quizId, remainingMs, handler);
  }

  async recoverActiveQuizzes(
    quizRepo: QuizSessionRepository,
    handler: QuizTimeoutHandler
  ): Promise<void> {
    const now = new Date();

    const activeQuizzes = await quizRepo.findAllActiveQuizzes();

    for (const quiz of activeQuizzes) {
      if (!quiz.end_datetime) continue;

      const remainingMs = quiz.end_datetime.getTime() - now.getTime();

      if (remainingMs <= 0) {
        // Time already expired while server was down
        await handler.onQuizTimeout(quiz.quiz_id);
        continue;
      }

      await this.initializeTimer(
        quiz.quiz_id,
        remainingMs,
        handler
      );
    }
  }


  async initializeTimer(
    quizId: number,
    durationMs: number,
    handler: QuizTimeoutHandler
  ): Promise<void> {
    const endAt = Date.now() + durationMs;

    this.clearTimer(quizId);

    const interval = setInterval(async () => {
      const remainingMs = endAt - Date.now();
      if (remainingMs <= 0) return;
      await handler.onTick(quizId, Math.ceil(remainingMs / 1000));
    }, 1000);

    const timeout = setTimeout(async () => {
      this.clearTimer(quizId);
      await handler.onQuizTimeout(quizId);
    }, durationMs);

    this.timers.set(quizId, { timeout, interval, endAt });
  }

  async pauseTimer(quizId: number): Promise<void> {
    const meta = this.timers.get(quizId);
    if (!meta) return;

    clearTimeout(meta.timeout);
    clearInterval(meta.interval);
  }

  async resumeTimer(
    quizId: number,
    remainingMs: number,
    handler: QuizTimeoutHandler
  ): Promise<void> {
    await this.initializeTimer(quizId, remainingMs, handler);
  }

  async clearTimer(quizId: number): Promise<void> {
    const meta = this.timers.get(quizId);
    if (!meta) return;

    clearTimeout(meta.timeout);
    clearInterval(meta.interval);
    this.timers.delete(quizId);
  }

  async computeRemainingMs(quizId: number): Promise<number> {
    const quizRepo = new QuizSessionRepository();
  const now = Date.now();

  const meta = this.timers.get(quizId);
  if (meta) {
    return Math.max(0, meta.endAt - now);
  }

  const session = await quizRepo.getQuizById(quizId);
  if (!session) return 0;

  if (session.session_state === QuizSessionState.PAUSED) {
    if (!session.paused_at || !session.end_datetime) return 0;

    const pausedAt = new Date(session.paused_at).getTime();
    const endAt = new Date(session.end_datetime).getTime();

    return Math.max(0, endAt - pausedAt);
  }

  if (session.session_state === QuizSessionState.ACTIVE) {
    if (!session.end_datetime) return 0;

    const endAt = new Date(session.end_datetime).getTime();
    return Math.max(0, endAt - now);
  }

  return 0;
}


}
