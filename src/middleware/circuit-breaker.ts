import { logger } from '@/config/logger';

interface CircuitBreakerConfig {
  failureThreshold?: number;
  resetTimeout?: number;
  monitorWindow?: number;
}

enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private lastFailureTime: number = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly monitorWindow: number;

  constructor({
    failureThreshold = 5,
    resetTimeout = 60000, // 1 minute
    monitorWindow = 60000, // 1 minute
  }: CircuitBreakerConfig = {}) {
    this.failureThreshold = failureThreshold;
    this.resetTimeout = resetTimeout;
    this.monitorWindow = monitorWindow;
  }

  private resetFailureCount = () => {
    this.failureCount = 0;
    this.lastFailureTime = 0;
  };

  private shouldResetWindow = (): boolean => {
    return Date.now() - this.lastFailureTime > this.monitorWindow;
  };

  public recordFailure = () => {
    if (this.shouldResetWindow()) {
      this.resetFailureCount();
    }

    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.failureThreshold) {
      this.state = CircuitState.OPEN;

      logger.warn('Circuit breaker opened', {
        failureCount: this.failureCount,
        threshold: this.failureThreshold,
      });

      setTimeout(() => {
        this.state = CircuitState.HALF_OPEN;
      }, this.resetTimeout);
    }
  };

  public recordSuccess = () => {
    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.resetFailureCount();
    }
  };

  public isOpen = (): boolean => {
    return this.state === CircuitState.OPEN;
  };

  public getState = (): CircuitState => {
    return this.state;
  };
}
