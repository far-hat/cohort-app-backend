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

import http from "http";
import { errorHandler } from "./middleware/errorHandler";
import { SocketService } from "./services/socketService";

const app = express();

app.use(cors({
  origin: ["http://localhost:5173", "http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}));


const server = http.createServer(app);
const socketService = new SocketService(server);
app.use(express.json());

app.use("/api/user", userRoute);
app.use("/api/quiz", quizRoutes);
app.use("/api/quiz/:quizId/questions", questionRoutes);
app.use("/api/quiz-session", quizSessionRoutes(socketService));
app.use("/api/quiz-results", quizResultsRoutes);
app.use("/api/course", courseRoutes);
app.use("/api/course/:courseId", cohortRoutes);

app.use(errorHandler);

app.get('/test', async(req,res)=>{
    res.json({message : "Hello"})
})



const PORT = process.env.PORT || 6500;

AppDataSource.initialize().then(()=>{
  console.log("Data source has been initialized!");
  server.listen(PORT, ()=>{
    console.log(`Backend and Socket.IO running at ${PORT}`)
  })
}).catch((err:any)=>{
  console.error("Error during Data Source initialization",err)
})