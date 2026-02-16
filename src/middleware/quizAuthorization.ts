import { Request, Response, NextFunction } from "express";
import AppDataSource from "../db/dataSource";
import { User } from "../entities/User";
import { Quiz } from "../entities/Quiz";
import { QuizAttempt } from "../entities/QuizAttempt";


export const authorizeQuizAccess = (requiredPermission: 'view' | 'edit' | 'manage') => {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const auth0Id = req.auth?.auth0Id;
            const quizId = Number(req.params.quiz_id);

            if (!auth0Id) {
                return res.status(401).json({ error: 'Authentication required' });
            }

            if (isNaN(quizId)) {
                return res.status(400).json({ error: "Invalid Quiz ID" });
            }

            const user = await AppDataSource.getRepository(User).findOne({
                where: { auth0Id: auth0Id },
                relations: ["mentor", "candidate"]
            });

            if (!user) {
                return res.status(404).json({ error: "User not found" })
            }

            const quiz = await AppDataSource.getRepository(Quiz).findOne({
                where: { quiz_id: quizId },
                relations: ["mentor", "questions", "questions.options"]
            });

            if (!quiz) {
                return res.status(404).json({ error: "Quiz not found" });
            }

            const hasAccess = await checkPermission(user, quiz, requiredPermission);

            if (!hasAccess) {
                return res.status(403).json({ error: `You dont have permission to ${requiredPermission} this quiz` });
            }

            req.auth!.user = user;
            req.quiz = quiz;

            next();

        } catch (error) {
            console.error('Authorization error:', error);
            res.status(500).json({ error: 'Authorization failed' });
        }
    }
}

async function checkPermission(
    user: User,
    quiz: Quiz,
    requiredPermission: 'view' | 'edit' | 'manage'
): Promise<boolean> {

    // -------------------- MENTOR --------------------
    if (user.mentor && user.mentor.mentor_id === quiz.mentor.mentor_id) {
        const mentorPermissions = {
            view: true,
            edit: quiz.status === 'draft' || quiz.session_state === 'scheduled',
            manage: quiz.canStart() || quiz.canPause() || quiz.canResume() || quiz.canStop()
        };

        return mentorPermissions[requiredPermission] || false;
    }

    // -------------------- CANDIDATE --------------------
    if (user.candidate) {
        const attemptRepo = AppDataSource.getRepository(QuizAttempt);
        if (requiredPermission !== "view") return false;

        switch (quiz.session_state) {
            case "active":
                // Anyone eligible can join, attempt will be created on join
                return true;

            case "paused":
                // Only candidates who already started can rejoin
                return await attemptRepo.exists({
                    where: {
                        candidate: { candidate_id: user.candidate.candidate_id },
                        quiz: { quiz_id: quiz.quiz_id }
                    }
                });

            case "ended":
                // Only candidates who attempted can view results
                return await attemptRepo.exists({
                    where: {
                        candidate: { candidate_id: user.candidate.candidate_id },
                        quiz: { quiz_id: quiz.quiz_id }
                    }
                });

            default:
                return false;
        }
    }


    return false;
}
