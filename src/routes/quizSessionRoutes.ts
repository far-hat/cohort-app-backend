import { Router } from "express";
import { QuizSessionService } from "../services/quizSessionService2";
import { QuizSessionController } from "../controller/QuizSessionController";
import { jwtParse } from "../middleware/auth";
import { authorizeQuizAccess } from "../middleware/quizAuthorization";
import { SocketService } from "../services/socketService";

import { QuizSessionRepository } from "../repository/quizSessionRepository";
import { SessionTimingService } from "../services/sessionTimingService";
import { QuizScheduler } from "../services/quizScheduler";
import { AttemptServiceImpl } from "../services/AttemptServiceImplementation";
import { AttemptRepository } from "../repository/attemptRepository";
import { SubmissionService } from "../services/submissionService";
import { SubmissionRepository } from "../repository/submissionRepository";

export default (socketService: SocketService) => {
  const router = Router();

  // -----------------------------
  // Infrastructure wiring
  // -----------------------------
  const quizRepo = new QuizSessionRepository();

  const scheduler = new QuizScheduler(null as any); 
  const timingService = new SessionTimingService();

  const attemptRepo = new AttemptRepository();
  const attemptService = new AttemptServiceImpl(attemptRepo, quizRepo);

  const submissionRepo = new SubmissionRepository();
  const submissionService = new SubmissionService(submissionRepo);

  
  const quizSessionService = new QuizSessionService(
    quizRepo,
    timingService,
    attemptService,
    submissionService,
    socketService
  );

  
  // Fix circular dependency
  (scheduler as any).timeoutHandler = quizSessionService;

  const quizSessionController = new QuizSessionController(quizSessionService);

  // -----------------------------
  // Routes
  // -----------------------------
  router.post('/:quiz_id/start', jwtParse, authorizeQuizAccess('manage'), quizSessionController.startQuiz.bind(quizSessionController));
  router.post('/:quiz_id/stop', jwtParse, authorizeQuizAccess('manage'), quizSessionController.stopQuiz.bind(quizSessionController));
  router.post('/:quiz_id/pause', jwtParse, authorizeQuizAccess('manage'), quizSessionController.pauseQuiz.bind(quizSessionController));
  router.post('/:quiz_id/resume', jwtParse, authorizeQuizAccess('manage'), quizSessionController.resumeQuiz.bind(quizSessionController));
  router.get('/:quiz_id/state', jwtParse, authorizeQuizAccess('view'), quizSessionController.getQuizState.bind(quizSessionController));
  router.post('/:quiz_id/join', jwtParse, authorizeQuizAccess('view'), quizSessionController.joinQuiz.bind(quizSessionController));
  router.get('/attempts/:attemptId',jwtParse,quizSessionController.getAttemptDetails.bind(quizSessionController));
  
  router.get(
  "/:quiz_id/snapshot",
  jwtParse,
  authorizeQuizAccess("view"),
  quizSessionController.getMentorSnapshot.bind(quizSessionController)
);

router.post('/attempts/:attemptId/submit',jwtParse,quizSessionController.submitQuiz.bind(quizSessionController));


  return router;
};
