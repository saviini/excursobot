interface RateLimitEntry {
  lastRequest: number;
  requestCount: number;
}

export class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number = 1, windowMs: number = 10000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(identifier);

    if (!entry) {
      this.limits.set(identifier, {
        lastRequest: now,
        requestCount: 1,
      });
      return true;
    }

    // Проверяем, не истекло ли окно времени
    if (now - entry.lastRequest > this.windowMs) {
      this.limits.set(identifier, {
        lastRequest: now,
        requestCount: 1,
      });
      return true;
    }

    // Проверяем количество запросов в текущем окне
    if (entry.requestCount >= this.maxRequests) {
      return false;
    }

    // Увеличиваем счетчик запросов
    entry.requestCount++;
    return true;
  }

  getRemainingTime(identifier: string): number {
    const entry = this.limits.get(identifier);
    if (!entry) return 0;

    const elapsed = Date.now() - entry.lastRequest;
    return Math.max(0, this.windowMs - elapsed);
  }

  // Очистка старых записей (можно вызывать периодически)
  cleanup(): void {
    const now = Date.now();
    for (const [identifier, entry] of this.limits.entries()) {
      if (now - entry.lastRequest > this.windowMs) {
        this.limits.delete(identifier);
      }
    }
  }
}
