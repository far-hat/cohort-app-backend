import { Server } from "socket.io";

export class SocketService {
  private io: Server;
  private quizRooms = new Map<number, Set<string>>(); // quiz_id -> client_ids

  constructor(server: any) {
    this.io = new Server(server, {
      cors: {
        origin:"http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
      },

      // connection state recovery
      connectionStateRecovery: {
        maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
        skipMiddlewares: true,
      }
    });

    this.setupSocketHandlers();

  // connection logging
    this.io.on("connection", (socket) => {
      console.log(`✅ Client connected: ${socket.id}`);
      console.log(`📊 Total clients: ${this.io.engine.clientsCount}`);
    });
  
  }



  
  private setupSocketHandlers() {
    this.io.on("connection", (socket) => {
      console.log("Client connected:", socket.id);

      // Join quiz room
      socket.on("join_quiz", (quizId: number) => {
        if(!quizId) {
          console.log(" No quizId provided for join_quiz");
          return;
        }

        socket.join(`quiz_${quizId}`);

        if (!this.quizRooms.has(quizId)) {
          this.quizRooms.set(quizId, new Set());
        }

        this.quizRooms.get(quizId)!.add(socket.id);

        console.log(`Client ${socket.id} joined quiz ${quizId}`);
        console.log(`👥 Room quiz_${quizId} now has: ${this.quizRooms.get(quizId)?.size} clients`);
      
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
