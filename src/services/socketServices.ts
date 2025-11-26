import { Server } from "socket.io";

export class SocketService {
  private io: Server;
  private quizRooms = new Map<number, Set<string>>(); // quiz_id -> client_ids

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || " http://localhost:5173/",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.setupSocketHandlers();
  }

  private setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      // Join quiz room
      socket.on("join_quiz", (quizId: number) => {
        socket.join(`quiz_${quizId}`);

        if (!this.quizRooms.has(quizId)) {
          this.quizRooms.set(quizId, new Set());
        }

        this.quizRooms.get(quizId)!.add(socket.id);

        console.log(`Client ${socket.id} joined quiz ${quizId}`);
      });

      // Leave quiz room
      socket.on("leave_quiz", (quizId: number) => {
        socket.leave(`quiz_${quizId}`);
        this.quizRooms.get(quizId)?.delete(socket.id);
      });

      // Cleanup on disconnect
      socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        this.quizRooms.forEach((clients) => {
          clients.delete(socket.id);
        });
      });
    });
  }

  // event broadcast
  broadcastToQuiz(quizId: number, event: string, payload: any) {
    this.io.to(`quiz_${quizId}`).emit(event, payload);

    // return number of clients
    return this.quizRooms.get(quizId)?.size || 0;
  }
}
