import { Options } from "../entities/Options";
import { QuizSessionState } from "../entities/Quiz";
import { QuizAnswer } from "../entities/QuizAnswer";
import { AttemptState } from "../entities/QuizAttempt";
import { redis } from "../redis/redisClient";
import { SubmissionRepository } from "../repository/submissionRepository";

export class SubmissionService {
  constructor(private submissionRepo: SubmissionRepository) {}

  async getActiveAttemptsForQuiz(quizId: number) {
    return this.submissionRepo.findActiveAttemptsForQuiz(quizId);
  }

  async submitAttempt(attemptId: number, auto = false) {
    const redisKey = `attempt:${attemptId}:answers`;
    const responses = await redis.hgetall(redisKey) || {};

    

    return SubmissionRepository.runInTransaction(async (repo) => {
      const attempt = await repo.findAttemptWithQuiz(attemptId);
      if (!attempt) throw new Error("Attempt not found");

      if (
        attempt.state === AttemptState.SUBMITTED ||
        attempt.state === AttemptState.AUTO_SUBMITTED
      ) {
        return { attempt, alreadySubmitted: true };
      }

      if (!auto && ![QuizSessionState.ACTIVE, QuizSessionState.PAUSED].includes(attempt.quiz.session_state)) {
        throw new Error("Quiz is not accepting submissions");
      }

      let correctAnswers = 0;
      const answers: QuizAnswer[] = [];

      for (const [questionKey, selectedValue] of Object.entries(responses)) {
        const questionId = Number(questionKey.replace("q", ""));
        const question = attempt.quiz.questions.find(
          (q) => q.question_id === questionId
        );
        if (!question) continue;

        let selectedOption: Options | null = null;
        let isCorrect = false;

        if (question.options?.length) {
          const option = question.options.find(
            (opt) => opt.option_id === Number(selectedValue)
          );
          if (!option) continue;

          selectedOption = option;
          isCorrect = option.correct_option;
        }

        if (isCorrect) correctAnswers++;

        answers.push(
          repo.createAnswer({
            attempt,
            question,
            selected_option: selectedOption,
            is_correct: isCorrect
          })
        );
      }

      const totalQuestions = attempt.quiz.questions.length;
      const percentage =
        totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0;

      const state = auto
        ? AttemptState.AUTO_SUBMITTED
        : AttemptState.SUBMITTED;

              await repo.saveAnswers(answers);


      await repo.markAttemptSubmitted(
        attemptId,
        correctAnswers,
        percentage,
        state
      );

      const updatedAttempt = await repo.findAttemptWithQuiz(attemptId);

      // move to QuizSessionService later
      try {
  await redis.del(redisKey);

  await redis.hset(`attempt:${attemptId}`, {
    submittedAt: Date.now().toString(),
    state
  });

  const quizId = attempt?.quiz?.quiz_id;

  if (quizId) {
    await redis.srem(
      `quiz:${quizId}:attempts`,
      attemptId.toString()
    );
  } else {
    console.warn("Skipping Redis srem: quizId missing for attempt", attemptId);
  }

} catch (redisErr) {
  console.error("Redis cleanup failed:", redisErr);
}
 

      return {
        attempt: updatedAttempt!,
        score: correctAnswers,
        percentage
      };
    });
  }
}
