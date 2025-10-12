import express from "express";
import cors from "cors";
import "dotenv/config";
//import {connectDB} from "./db/connection"
import AppDataSource from "./db/dataSource"
import userRoute from "./routes/userRoute"
import quizRoutes from "./routes/quizRoutes"
import questionRoutes from "./routes/questionRoutes"

const app = express();

const PORT = process.env.PORT || 6500;

app.use(express.json());
app.use(cors());
app.use("/api/user",userRoute);
app.use("/api/quiz",quizRoutes);
app.use("/api/quiz/:quizId/questions",questionRoutes);

app.get('/test', async(req,res)=>{
    res.json({message : "Hello"})
})

AppDataSource.initialize().then(()=>{
  console.log("Data source has been initialized!");
  app.listen(PORT, ()=>{
    console.log(`server started at ${PORT}`)
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
