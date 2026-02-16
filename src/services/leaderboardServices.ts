import { redis } from "../redis/redisClient";

export class LeaderboardService {
  async getLeaderboard(quizId: number) {
    const attemptIds = await redis.smembers(`quiz:${quizId}:attempts`);
    const leaderboard = [];

    for (const attemptId of attemptIds) {
      const meta = await redis.hgetall(`attempt:${attemptId}`);
      const answers = await redis.hgetall(`attempt:${attemptId}:answers`);

      leaderboard.push({
        attemptId: Number(attemptId),
        candidateName: meta.candidateName,
        score: Object.keys(answers).length,
        connected: meta.connected === "true",
        lastSeen: new Date(Number(meta.lastSeen || "0"))
      });
    }

    return leaderboard.sort((a, b) => b.score - a.score);
  }
}
