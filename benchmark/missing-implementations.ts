
// Test file with missing implementations
interface ILogger {
  log(message: string): void;
  error(message: string, error?: Error): void;
  warn(message: string): void;
  debug(message: string, data?: any): void;
}

class ConsoleLogger implements ILogger {
  log(message: string): void {
    console.log(message);
  }

  error(message: string, error?: Error): void {
    console.error(message, error);
  }

  // Missing implementation
  warn(message: string): void;

  // Missing implementation
  debug(message: string, data?: any): void;
}

abstract class BaseService {
  protected abstract initialize(): Promise<void>;
  protected abstract shutdown(): Promise<void>;

  public async start(): Promise<void> {
    await this.initialize();
    console.log('Service started');
  }

  public async stop(): Promise<void> {
    await this.shutdown();
    console.log('Service stopped');
  }
}

class UserService extends BaseService {
  // Missing implementation of abstract methods
}
