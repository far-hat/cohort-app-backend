import { Quiz } from "../entities/Quiz";
import { QuizAttempt } from "../entities/QuizAttempt";
import { User } from "../entities/User";
import { AttemptService } from "./attemptService";
import { QuizSessionRepository } from "../repository/quizSessionRepository";
import { QuizTimeoutHandler } from "./quizTimeoutHandler";
import { SessionTimingService } from "./sessionTimingService";
import { SubmissionService } from "./submissionService";
import { QuizSessionState } from "../entities/Quiz";
import { SocketService } from "./socketService";

export class QuizSessionService implements QuizTimeoutHandler {
  constructor(
    private quizRepo: QuizSessionRepository,
    private timingService: SessionTimingService,
    private attemptService: AttemptService,
    private submissionService: SubmissionService,
    private socketService: SocketService,
  ) { }

  // -----------------------------
  // QUIZ LIFECYCLE
  // -----------------------------

  async onTick(quizId: number, remainingSeconds: number): Promise<void> {
    this.socketService.emitToQuiz(quizId, "quiz:tick", {
      quizId,
      remainingSeconds,
    });
  }

  async recoverActiveSessions(): Promise<void> {
    const activeQuizzes = await this.quizRepo.findAllActiveQuizzes();

    for (const quiz of activeQuizzes) {
      if (!quiz.end_datetime) continue;

      const remainingMs =
        quiz.end_datetime.getTime() - new Date().getTime();

      if (remainingMs <= 0) {
        await this.autoStopQuiz(quiz.quiz_id);
        continue;
      }

      await this.timingService.initializeTimer(
        quiz.quiz_id,
        remainingMs,
        this
      );
    }
  }


  async onQuizTimeout(quizId: number): Promise<void> {
    await this.autoStopQuiz(quizId);
  }

  async startQuiz(quiz: Quiz): Promise<Quiz> {
    if (!quiz.canStart()) {
      throw new Error("Quiz cannot be started in its current state");
    }

    const updatedQuiz = await this.quizRepo.markSessionStarted(quiz.quiz_id);

    const remainingMs = updatedQuiz.end_datetime?.getTime()! - new Date().getTime();

    console.log(`remaining ms is ${remainingMs}`);
    await this.timingService.initializeTimer(updatedQuiz.quiz_id, remainingMs!, this);
    const snapshot = await this.getMentorSnapshot(updatedQuiz);


    this.socketService.emitToQuiz(updatedQuiz.quiz_id, "quiz:started", {
      quizId: updatedQuiz.quiz_id,
      state: updatedQuiz.session_state
    });

    

    this.socketService.emitToQuiz(updatedQuiz.quiz_id, "quiz:snapshot_updated", snapshot);

    return updatedQuiz;
  }


  async pauseQuiz(quiz: Quiz): Promise<Quiz> {
    if (!quiz.canPause()) {
      throw new Error("Quiz cannot be paused in its current state");
    }

    const updatedQuiz = await this.quizRepo.markSessionPaused(quiz.quiz_id);
    await this.timingService.clearTimer(quiz.quiz_id);
    const snapshot = await this.getMentorSnapshot(updatedQuiz);


    this.socketService.emitToQuiz(updatedQuiz.quiz_id, "quiz:paused", {
      quizId: updatedQuiz.quiz_id,
      state: updatedQuiz.session_state
    });
    this.socketService.emitToQuiz(updatedQuiz.quiz_id, "quiz:snapshot_updated", snapshot);

    return updatedQuiz;
  }


  async resumeQuiz(quiz: Quiz): Promise<Quiz> {
    if (!quiz.canResume()) {
      throw new Error("Quiz cannot be resumed in its current state");
    }

    const updatedQuiz = await this.quizRepo.markSessionResumed(quiz.quiz_id);
    const remainingMs =
      updatedQuiz.end_datetime!.getTime() - new Date().getTime();

    await this.timingService.resumeTimer(quiz.quiz_id, remainingMs, this);
    const snapshot = await this.getMentorSnapshot(updatedQuiz);

    const activeAttempts =
      await this.submissionService.getActiveAttemptsForQuiz(quiz.quiz_id);

    for (const attempt of activeAttempts) {
  const attemptQuestions = await this.getAttemptQuestions(attempt.attempt_id, quiz);
  
  this.socketService.emitToUser(attempt.candidate.user.user_id, "quiz:resumed", {
    attemptId: attempt.attempt_id,
    quizId: quiz.quiz_id,
    questions: attemptQuestions.questions,
    sessionState: attemptQuestions.sessionState,
    totalQuestions: attemptQuestions.totalQuestions
  });
}


   
    this.socketService.emitToQuiz(updatedQuiz.quiz_id, "quiz:snapshot_updated", snapshot);

    return updatedQuiz;
  }


  async stopQuiz(
    quiz: Quiz,
    reason: "mentor_stopped" | "system" | "force_end"
  ): Promise<Quiz> {
    if (!quiz.canStop()) {
      throw new Error("Quiz cannot be stopped in its current state");
    }

    if (reason === "force_end") {

      const updatedQuiz = await this.quizRepo.markSessionEnded(quiz.quiz_id);
      await this.timingService.clearTimer(quiz.quiz_id);

      const snapshot = await this.getMentorSnapshot(updatedQuiz);
      this.socketService.emitToQuiz(updatedQuiz.quiz_id, "quiz:snapshot_updated", snapshot);

      this.socketService.emitToQuiz(updatedQuiz.quiz_id, "quiz:stopped", {
        quizId: updatedQuiz.quiz_id,
        reason,
        state: updatedQuiz.session_state
      });

      return updatedQuiz;
    }
    await this.autoStopQuiz(quiz.quiz_id);

    this.socketService.emitToQuiz(quiz.quiz_id, "quiz:stopped", {
      quizId: quiz.quiz_id,
      reason,
      state: QuizSessionState.ENDED
    });

    return this.quizRepo.getQuizById(quiz.quiz_id);
  }

  async autoStopQuiz(quizId: number): Promise<{
    quizId: number;
    results: Array<{
      attemptId: number;
      score: number;
      percentage: number;
    }>;
  }> {
    await this.quizRepo.markSessionEnded(quizId);
    await this.timingService.clearTimer(quizId);

    const activeAttempts =
      await this.submissionService.getActiveAttemptsForQuiz(quizId);

    const results: Array<{
      attemptId: number;
      score: number;
      percentage: number;
    }> = [];

    for (const attempt of activeAttempts) {
      try {
        const result = await this.submissionService.submitAttempt(
          attempt.attempt_id,
          true
        );

        results.push({
          attemptId: attempt.attempt_id,
          score: result.score ?? 0,
          percentage: result.percentage ?? 0
        });
      } catch (err) {
        console.error(
          `Auto-submit failed for attempt ${attempt.attempt_id}`,
          err
        );
      }
    }

    const quiz = await this.quizRepo.getQuizById(quizId);
    const snapshot = await this.getMentorSnapshot(quiz);

    this.socketService.emitToQuiz(quizId, "quiz:snapshot_updated", snapshot);
    this.socketService.emitToQuiz(quizId, 'quiz:stopped', {
      quizId: quiz.quiz_id,
      reason: "time_up",
      state: QuizSessionState.ENDED
    })

    return { quizId, results };
  }

  async getQuizState(quiz: Quiz): Promise<Quiz> {
    return this.quizRepo.getQuizById(quiz.quiz_id);
  }

  // -----------------------------
  // CANDIDATE FLOW
  // -----------------------------

  async canJoinQuiz(user: User, quiz: Quiz): Promise<void> {
    if (!user.candidate) {
      throw new Error("Only candidates can join quizzes");
    }

    const sessionState = await this.quizRepo.getQuizState(quiz.quiz_id);

    if (
      ![QuizSessionState.ACTIVE, QuizSessionState.PAUSED].includes(sessionState)
    ) {
      throw new Error("Quiz is not joinable at this time");
    }

    // All candidates eligible for now
  }

  async getMentorSnapshot(quiz: Quiz) {
    const attemptData = await this.attemptService.getMentorSnapshot(quiz.quiz_id, quiz.start_datetime!);

    const remainingTime = await this.timingService.computeRemainingMs(quiz.quiz_id);

    return {
      sessionState: quiz.session_state,
      remainingTime,
      ...attemptData
    };
  }


  async createAttempt(user: User, quiz: Quiz): Promise<QuizAttempt> {
    await this.canJoinQuiz(user, quiz);

    const attempt = await this.attemptService.createOrRestoreAttempt(user, quiz);
    const snapshot = await this.getMentorSnapshot(quiz);


    const attemptQuestions = await this.getAttemptQuestions(attempt.attempt_id, quiz);

    this.socketService.emitToUser(user.user_id, "attempt:created", {
      attemptId: attempt.attempt_id,
      quizId: quiz.quiz_id,
      questions: attemptQuestions.questions,
      sessionState: attemptQuestions.sessionState,
      totalQuestions: attemptQuestions.totalQuestions
    });

    

    this.socketService.emitToQuiz(quiz.quiz_id, "quiz:attempt_joined", {
      attemptId: attempt.attempt_id,
      userId: user.user_id
    });

    this.socketService.emitToQuiz(quiz.quiz_id, "quiz:snapshot_updated", snapshot);

    return attempt;
  }



  async getAttemptDetails(attemptId: number) {
    return this.attemptService.getAttemptWithQuiz(attemptId);
  }

  async getAttemptQuestions(attemptId: number, quiz: Quiz) {
    const attempt = this.attemptService.getAttemptWithQuiz(attemptId);
    if (!attempt) throw new Error("Attempt not found");

    if (!["active", "paused", "ended"].includes(quiz.session_state)) throw new Error("Quiz is not currently accessible");

    const questions = quiz.questions.map(q => ({
      questionId: q.question_id,
      text: q.question_text,
      options: q.options.map(o => ({
        optionId: o.option_id,
        text: o.option_text
      }))
    }));
    return {


      attemptId: (await attempt).attempt_id,
      quizId: quiz.quiz_id,
      sessionState: quiz.session_state,
      totalQuestions: questions.length,
      questions

    }



  }


  async submitAttempt(
    attemptId: number,
    auto = false
  ): Promise<{ attempt: QuizAttempt; score: number; percentage: number }> {

    const result = await this.submissionService.submitAttempt(attemptId, auto);


    if (result.score !== undefined && result.percentage !== undefined) {
      this.socketService.emitToAttempt(attemptId, "attempt:submitted", {
        attemptId,
        score: result.score,
        percentage: result.percentage,
        auto
      });
    }

    const attemptWithQuiz = result.attempt;
    const quiz = attemptWithQuiz!.quiz;

    const snapshot = await this.getMentorSnapshot(quiz);

    this.socketService.emitToQuiz(quiz.quiz_id, "quiz:snapshot_updated", snapshot);
    

    return {
      attempt: result.attempt,
      score: result.score!,
      percentage: result.percentage!
    };
  }

}
