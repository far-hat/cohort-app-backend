export interface QuizTimeoutHandler {
  onQuizTimeout(quizId: number): Promise<void>;
  onTick(quizId : number,remainingSeconds : number) : Promise<void>;
}
