export interface LogEvent {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  event: string;
  message: string;
  data?: Record<string, any>;
}

export class Logger {
  private static formatLog(event: LogEvent): string {
    const base = `[${event.timestamp}] ${event.level.toUpperCase()}: ${event.event} - ${event.message}`;
    if (event.data) {
      return `${base} | ${JSON.stringify(event.data)}`;
    }
    return base;
  }

  static info(event: string, message: string, data?: Record<string, any>): void {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      level: 'info',
      event,
      message,
      data,
    };
    console.log(this.formatLog(logEvent));
  }

  static warn(event: string, message: string, data?: Record<string, any>): void {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      level: 'warn',
      event,
      message,
      data,
    };
    console.warn(this.formatLog(logEvent));
  }

  static error(event: string, message: string, data?: Record<string, any>): void {
    const logEvent: LogEvent = {
      timestamp: new Date().toISOString(),
      level: 'error',
      event,
      message,
      data,
    };
    console.error(this.formatLog(logEvent));
  }

  static debug(event: string, message: string, data?: Record<string, any>): void {
    if (process.env.NODE_ENV === 'development') {
      const logEvent: LogEvent = {
        timestamp: new Date().toISOString(),
        level: 'debug',
        event,
        message,
        data,
      };
      console.log(this.formatLog(logEvent));
    }
  }
}
