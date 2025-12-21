import { Router } from "express";
import { QuizResultsService } from "../services/quizResultsService";

const router = Router();
const quizResultsService = new QuizResultsService();

// Get quiz results summary
router.get('/:quizId/summary', async (req, res) => {
    try {
        const { quizId } = req.params;
        const results = await quizResultsService.getQuizResultsSummary(Number(quizId));
        
        res.json({
            success: true,
            data: results
        });
    } catch (error: any) {
        console.error('Error fetching quiz results summary:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Get detailed quiz results
router.get('/:quizId/detailed', async (req, res) => {
    try {
        const { quizId } = req.params;
        const results = await quizResultsService.getDetailedQuizResults(Number(quizId));
        
        res.json({
            success: true,
            data: results
        });
    } catch (error: any) {
        console.error('Error fetching detailed quiz results:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// Get question-wise analytics
router.get('/:quizId/question-analytics', async (req, res) => {
    try {
        const { quizId } = req.params;
        const analytics = await quizResultsService.getQuestionAnalytics(Number(quizId));
        
        res.json({
            success: true,
            data: analytics
        });
    } catch (error: any) {
        console.error('Error fetching question analytics:', error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

export default router;