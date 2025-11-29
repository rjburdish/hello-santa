// Rate limiting utility stub - will be implemented in V0.2+

export class RateLimiter {
  private messageCounts: Map<string, { count: number; resetTime: number }> = new Map();

  constructor(
    private maxMessages: number = 100,
    private windowMs: number = 60000
  ) {}

  checkLimit(clientId: string): boolean {
    const now = Date.now();
    const record = this.messageCounts.get(clientId);

    if (!record || now > record.resetTime) {
      this.messageCounts.set(clientId, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }

    if (record.count >= this.maxMessages) {
      return false;
    }

    record.count++;
    return true;
  }
}
