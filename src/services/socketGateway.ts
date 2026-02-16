import { Server, Socket } from "socket.io";
import { redis } from "../redis/redisClient";
import { QuizSessionService } from "./quizSessionService2";

export function registerSocketHandlers(
  io: Server,
  quizSessionService: QuizSessionService
) {
  io.on("connection", (socket: Socket) => {
    console.log("Client connected:", socket.id);

    // ------------------------
    // JOIN QUIZ
    // ------------------------
    socket.on("mentor_joined",({quizId})=> {
        console.log("Mentor joined");
        socket.join(`quiz:${quizId}`);
    })
    socket.on("join_quiz", async ({ quizId,attemptId }) => {
      console.log("Joining quiz room:", quizId);
      socket.join(`quiz:${quizId}`);
      if(attemptId){
        socket.join(`attempt:${attemptId}`);
      }
    });

    // ------------------------
    // ANSWER SAVED
    // ------------------------
    socket.on("answer_saved", async ({ attemptId, questionId, optionId }) => {
      console.log("Answer received:", attemptId, questionId, optionId);

      const redisKey = `attempt:${attemptId}:answers`;
      await redis.hset(redisKey, `q${questionId}`, optionId.toString());
    });

    // ------------------------
    // SUBMIT ATTEMPT
    // ------------------------
    socket.on("candidate_submitted", async ({ attemptId }) => {
      console.log("Submitting attempt:", attemptId);
      await quizSessionService.submitAttempt(attemptId, false);
      
    });


    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });
}
