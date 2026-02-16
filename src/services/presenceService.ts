import { redis } from "../redis/redisClient";

export class PresenceService {
  async registerConnection(userId: string, socketId: string) {
    await redis.set(`socket:${userId}`, socketId);
    await redis.set(`socket:${socketId}:user`, userId);
  }

  async unregisterConnection(socketId: string) {
    const userId = await redis.get(`socket:${socketId}:user`);
    if (!userId) return;
    await redis.del(`socket:${socketId}:user`);
    await redis.del(`socket:${userId}`);
  }
}

