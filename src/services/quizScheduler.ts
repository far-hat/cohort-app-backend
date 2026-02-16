import { redis } from "../redis/redisClient";
import { QuizTimeoutHandler } from "./quizTimeoutHandler";

export class QuizScheduler {
  private intervals = new Map<number, NodeJS.Timeout>();

  constructor(private timeoutHandler: QuizTimeoutHandler) {}

  async scheduleQuiz(quizId: number): Promise<void> {
    if (this.intervals.has(quizId)) return;

    const interval = setInterval(async () => {
      const remaining = await redis.decr(`quiz:${quizId}:remaining`);


      await this.timeoutHandler.onTick(quizId,remaining);

      if(remaining<= 0){
        await this.clearSchedule(quizId);
        await this.timeoutHandler.onQuizTimeout(quizId);
      }
    }, 1000);

    this.intervals.set(quizId, interval);
  }

  
  async cancelQuiz(quizId: number): Promise<void> {
    const interval = this.intervals.get(quizId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(quizId);
    }
  }

  async clearSchedule(quizId: number) {
    const interval = this.intervals.get(quizId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(quizId);
    }
  }

}
