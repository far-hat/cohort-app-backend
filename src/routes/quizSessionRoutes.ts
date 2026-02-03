import { Router } from "express";
import { QuizSessionService } from "../services/quizSessionService2";
import { QuizSessionController } from "../controller/QuizSessionController";
import { jwtParse } from "../middleware/auth";
import { SocketService } from "../services/socketService";
import { authorizeQuizAccess } from "../middleware/quizAuthorization";


export default (socketService: SocketService) => {
    const router = Router();

    const quizSessionService = new QuizSessionService(socketService);
    const quizSessionController = new QuizSessionController(quizSessionService);


    router.post('/:quiz_id/start', jwtParse,authorizeQuizAccess('manage'), quizSessionController.startQuiz.bind(quizSessionController));
    router.post('/:quiz_id/stop',jwtParse,authorizeQuizAccess('manage'),  quizSessionController.stopQuiz.bind(quizSessionController));
    router.post('/:quiz_id/pause', jwtParse,authorizeQuizAccess('manage'),quizSessionController.pauseQuiz.bind(quizSessionController));
    router.post('/:quiz_id/resume', jwtParse,authorizeQuizAccess('manage'), quizSessionController.resumeQuiz.bind(quizSessionController));
    router.get('/:quiz_id/state', jwtParse, authorizeQuizAccess('manage'),quizSessionController.getQuizState.bind(quizSessionController));
    router.post('/:quiz_id/join', jwtParse,authorizeQuizAccess('view'), quizSessionController.joinQuiz.bind(quizSessionController));
    return router;
}