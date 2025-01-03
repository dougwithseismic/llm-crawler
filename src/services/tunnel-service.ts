import ngrok from 'ngrok';
import { logger } from '../config/logger';

export interface TunnelConfig {
  port: number;
  authtoken?: string;
}

export class TunnelService {
  private url: string | null = null;

  async connect({ port, authtoken }: TunnelConfig): Promise<string> {
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
      await ngrok.disconnect();
      this.url = null;
      logger.info('Tunnel disconnected');
    }
  }

  getUrl(): string | null {
    return this.url;
  }
}
