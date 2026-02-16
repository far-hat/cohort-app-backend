import { EntityManager, In, Repository } from "typeorm";
import AppDataSource from "../db/dataSource";
import { AttemptState, QuizAttempt } from "../entities/QuizAttempt";
import { QuizAnswer } from "../entities/QuizAnswer";

export class SubmissionRepository {
  private attemptRepo: Repository<QuizAttempt>;
  private answerRepo: Repository<QuizAnswer>;

  constructor(manager? : EntityManager) {
    const dataSource = manager ?? AppDataSource;
    this.attemptRepo = AppDataSource.getRepository(QuizAttempt);
    this.answerRepo = AppDataSource.getRepository(QuizAnswer);
  }

  createAnswer(data: Partial<QuizAnswer>): QuizAnswer {
  return this.answerRepo.create(data);
}

  async markAttemptSubmitted(
  attemptId: number,
  score: number,
  percentage: number,
  state: AttemptState.SUBMITTED | AttemptState.AUTO_SUBMITTED
): Promise<QuizAttempt> {
  const attempt = await this.attemptRepo.findOneByOrFail({
    attempt_id: attemptId
  });

  attempt.score = score;
  attempt.percentage = percentage;
  attempt.submitted_at = new Date();
  attempt.state = state;

  return this.attemptRepo.save(attempt);
}

async findActiveAttemptsForQuiz(quizId: number): Promise<QuizAttempt[]> {
  return this.attemptRepo.find({
    where: {
      quiz: { quiz_id: quizId },
      state: In([AttemptState.CREATED,AttemptState.IN_PROGRESS])
    },
    relations: ["quiz", "candidate"]
  });
}


  async findAttemptWithQuiz(attemptId: number): Promise<QuizAttempt | null> {
    return this.attemptRepo.findOne({
      where: { attempt_id: attemptId },
      relations: [
        "quiz",
        "candidate",
        "quiz.questions",
        "quiz.questions.options"
      ]
    });
  }

  async saveAttempt(attempt: QuizAttempt): Promise<QuizAttempt> {
    return this.attemptRepo.save(attempt);
  }

  async saveAnswers(answers: QuizAnswer[]): Promise<QuizAnswer[]> {
    return this.answerRepo.save(answers);
  }

  static async runInTransaction<T>(
    fn: (repo: SubmissionRepository) => Promise<T>
  ): Promise<T> {
    return AppDataSource.transaction(async (manager) => {
      const repo = new SubmissionRepository(manager);
      
      return fn(repo);
    });
  }
}
