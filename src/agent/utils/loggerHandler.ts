class Logger {
  private readonly context: string;

  constructor(context: string = "APP") {
    this.context = context;
  }

  // 基础工具方法
  private timestamp(): string {
    return new Date().toISOString();
  }

  private format(level: string, message: string, ...args: any[]): string {
    return `[${this.timestamp()}] [${level}] [${this.context}] ${message} ${
      args.length > 0 ? JSON.stringify(args) : ""
    }`;
  }

  // 常规日志
  info(message: string, ...args: any[]): void {
    console.log(this.format("INFO", message, ...args));
  }

  // 调试日志
  debug(message: string, ...args: any[]): void {
    console.debug(this.format("DEBUG", message, ...args));
  }

  // 警告
  warn(message: string, ...args: any[]): void {
    console.warn(this.format("WARN", message, ...args));
  }

  // 错误
  error(message: string, ...args: any[]): void {
    console.error(this.format("ERROR", message, ...args));
  }
}

// 创建全局实例（和你 Python 用法完全一样）
export const logger = new Logger("AGENT");

// 也支持创建自定义上下文
export const createLogger = (context: string) => new Logger(context);