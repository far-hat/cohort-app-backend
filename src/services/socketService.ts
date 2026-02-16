import { Server } from "socket.io";

export class SocketService {
  constructor(private io: Server) {}

  emitToUser(userId: number, event: string, payload: any) {
    this.io.to(`user:${userId}`).emit(event, payload);
  }

  emitToQuiz(quizId: number, event: string, payload: any) {
    this.io.to(`quiz:${quizId}`).emit(event, payload);
  }

  emitToAttempt(attemptId: number, event: string, payload: any) {
    this.io.to(`attempt:${attemptId}`).emit(event, payload);
  }

  emitGlobal(event: string, payload: any) {
    this.io.emit(event, payload);
  }
}
