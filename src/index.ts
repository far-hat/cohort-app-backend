import express from "express";
import cors from "cors";
import "dotenv/config";

import AppDataSource from "./db/dataSource"
import userRoute from "./routes/userRoute"
import quizRoutes from "./routes/quizRoutes"
import questionRoutes from "./routes/questionRoutes"
import quizSessionRoutes from "./routes/quizSessionRoutes"
import courseRoutes from "./routes/courseRoutes"
import cohortRoutes from "./routes/cohortRoutes"

import http from "http" ;
import { SocketService } from "./services/socketServices";
import { errorHandler } from "./middleware/errorHandler";


const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  credentials: true
}));

//app.options("*", cors());

// body parser
app.use(express.json());


app.use("/api/user",userRoute);
app.use("/api/quiz",quizRoutes);
app.use("/api/quiz/:quizId/questions",questionRoutes);
app.use("/api/quiz-session",quizSessionRoutes);
app.use("/api/course",courseRoutes);
app.use("/api/course/:courseId",cohortRoutes);

app.use(errorHandler);

app.get('/test', async(req,res)=>{
    res.json({message : "Hello"})
})

const server = http.createServer(app);
//initialize socket service after server creation. 
export const socketService = new SocketService(server);

const PORT = process.env.PORT || 6500;

AppDataSource.initialize().then(()=>{
  console.log("Data source has been initialized!");
  server.listen(PORT, ()=>{
    console.log(`Backend and Socket.IO running at ${PORT}`)
  })
}).catch((err:any)=>{
  console.error("Error during Data Source initialization",err)
})

/*
// Wrap server start in an async function
const startServer = async () => {
  try {
    await connectDB(); // ✅ Make sure DB is connected first

    app.listen(PORT, () => {
      console.log(`🚀 App started at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    process.exit(1); // Exit if DB connection fails
  }
};

startServer();
*/
