import AppDataSource from "../db/dataSource";
import { AttemptState, QuizAttempt } from "../entities/QuizAttempt";


export class AttemptRepository {
  private repo = AppDataSource.getRepository(QuizAttempt);

  async findLatestByCandidateAndQuizForSession(
    candidateId: number,
    quizId: number,
    sessionStart: Date
  ): Promise<QuizAttempt | null> {
    return this.repo
      .createQueryBuilder("attempt")
      .leftJoinAndSelect("attempt.candidate", "candidate")
      .leftJoinAndSelect("candidate.user", "user")
      .leftJoinAndSelect("attempt.quiz", "quiz")
      .where("candidate.candidate_id = :candidateId", { candidateId })
      .andWhere("quiz.quiz_id = :quizId", { quizId })
      .andWhere("attempt.created_at >= :sessionStart", { sessionStart })
      .orderBy("attempt.created_at", "DESC")
      .getOne();
  }


  async createAttempt(data: Partial<QuizAttempt>): Promise<QuizAttempt> {
    const attempt = this.repo.create(data);
    return this.repo.save(attempt);
  }

  async getMentorSnapshot(quizId: number, sessionStart : Date) {

    const attempts = await this.repo
      .createQueryBuilder("attempt")
      .leftJoinAndSelect("attempt.quiz", "quiz")
      .leftJoinAndSelect("attempt.candidate", "candidate")
      .leftJoinAndSelect("attempt.answers", "answers")
      .where("quiz.quiz_id = :quizId", { quizId })
      .andWhere("attempt.created_at >= :sessionStart", { sessionStart })
      .getMany();

    const candidates = attempts.map(a => {
      const answeredCount = a.answers?.length ?? 0;
      const total = a.total_questions || 1;

      return {
        attemptId: a.attempt_id,
        candidateId: a.candidate.candidate_id,
        name: a.candidate.full_name,
        state: a.state,
        score: a.score,
        progressPercent: Math.round((answeredCount / total) * 100),
        joinedAt: a.created_at,
        submittedAt: a.submitted_at
      };
    });

    return {
      totalCandidates: candidates.length,
      candidates
    };
  }



  async getQuizAttempt(attemptId: number) {
    return this.repo.findOneOrFail({
      where: { attempt_id: attemptId },
      relations: {
        quiz: {
          questions: {
            options: true
          }
        },
        answers: {
          question: true,
          selected_option: true
        }
      }
    });
  }


  async markSubmitted(attemptId: number, score: number, percentage: number): Promise<QuizAttempt> {
    const attempt = await this.repo.findOneByOrFail({ attempt_id: attemptId });
    attempt.score = score;
    attempt.percentage = percentage;
    attempt.submitted_at = new Date();
    attempt.state = AttemptState.SUBMITTED;
    return this.repo.save(attempt);
  }
}
