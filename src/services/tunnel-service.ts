import ngrok from 'ngrok';
import { logger } from '../config/logger';

export interface TunnelConfig {
  port: number;
  authtoken?: string;
}

export type TunnelStatus =
  | 'disconnected'
  | 'connecting'
  | 'connected'
  | 'error';

export class TunnelService {
  private url: string | null = null;
  private status: TunnelStatus = 'disconnected';
  private connectionPromise: Promise<string> | null = null;

  getStatus(): TunnelStatus {
    return this.status;
  }

  async waitUntilConnected(timeoutMs = 30000): Promise<string> {
    if (this.status === 'connected' && this.url) {
      return this.url;
    }

    if (!this.connectionPromise) {
      throw new Error('No active connection attempt. Call connect() first.');
    }

    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('Tunnel connection timeout')),
        timeoutMs,
      );
    });

    return Promise.race([this.connectionPromise, timeoutPromise]);
  }

  async connect({ port, authtoken }: TunnelConfig): Promise<string> {
    if (this.status === 'connected' && this.url) {
      return this.url;
    }

    this.status = 'connecting';
    this.connectionPromise = this.establishConnection({ port, authtoken });

    try {
      const url = await this.connectionPromise;
      this.status = 'connected';
      return url;
    } catch (error) {
      this.status = 'error';
      throw error;
    }
  }

  private async establishConnection({
    port,
    authtoken,
  }: TunnelConfig): Promise<string> {
    try {
      if (authtoken) {
        await ngrok.authtoken(authtoken);
      }

      this.url = await ngrok.connect({
        addr: port,
        proto: 'http',
      });

      logger.info(`Tunnel established at: ${this.url}`);
      return this.url;
    } catch (error) {
      logger.error('Failed to establish tunnel:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.url) {
      this.status = 'disconnected';
      this.connectionPromise = null;
      await ngrok.disconnect();
      this.url = null;
      logger.info('Tunnel disconnected');
    }
  }

  getUrl(): string | null {
    return this.url;
  }
}
