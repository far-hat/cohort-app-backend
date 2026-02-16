import express from "express";
import cors from "cors";
import "dotenv/config";

import AppDataSource from "./db/dataSource"
import userRoute from "./routes/userRoute"
import quizRoutes from "./routes/quizRoutes"
import questionRoutes from "./routes/questionRoutes"
import quizSessionRoutes from "./routes/quizSessionRoutes"
import quizResultsRoutes from "./routes/quizResultsRoutes"
import courseRoutes from "./routes/courseRoutes"
import cohortRoutes from "./routes/cohortRoutes"
import { Server as SocketIOServer } from "socket.io"
import { redis } from "./redis/redisClient";
import http from "http";
import { errorHandler } from "./middleware/errorHandler";
import { SocketService } from "./services/socketService";
import { SessionTimingService } from "./services/sessionTimingService";
import { QuizSessionRepository } from "./repository/quizSessionRepository";
import { SubmissionRepository } from "./repository/submissionRepository";
import { QuizSessionService } from "./services/quizSessionService2";
import { AttemptServiceImpl } from "./services/AttemptServiceImplementation";
import { SubmissionService } from "./services/submissionService";
import { AttemptRepository } from "./repository/attemptRepository";
import { registerSocketHandlers } from "./services/socketGateway";



const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));

app.use(express.json());

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: {
    origin: ["http://localhost:5173", "http://localhost:3000"],
    credentials: true
  }
});
const socketService = new SocketService(io);


app.use("/api/user", userRoute);
app.use("/api/quiz", quizRoutes);
app.use("/api/quiz/:quizId/questions", questionRoutes);
app.use("/api/quiz-session", quizSessionRoutes(socketService));
app.use("/api/quiz-results", quizResultsRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/course/:courseId", cohortRoutes);

app.use(errorHandler);

app.get('/test', async (req, res) => {
  res.json({ message: "Hello" })
})



const PORT = process.env.PORT || 6500;

AppDataSource.initialize().then(async () => {
  console.log("Data source has been initialized!");

  // -----------------------------
    // Infrastructure wiring
    // -----------------------------
    const quizRepo = new QuizSessionRepository();
  
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

    await quizSessionService.recoverActiveSessions();
   
    registerSocketHandlers(io,quizSessionService);


  server.listen(PORT, () => {
    console.log(`Backend and Socket.IO running at ${PORT}`)
  })
}).catch((err: any) => {
  console.error("Error during Data Source initialization", err)
})