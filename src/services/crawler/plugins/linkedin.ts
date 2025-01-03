import type { Page } from 'playwright';
import type { CrawlerPlugin, PluginConstructorOptions } from '../types/plugin';

interface LinkedInMetrics {
  title: string;
  metaTags: Record<string, string>;
}

interface LinkedInPluginOptions extends PluginConstructorOptions {
  li_at?: string;
}

export class LinkedInPlugin
  implements CrawlerPlugin<'linkedin', LinkedInMetrics, LinkedInMetrics>
{
  readonly name = 'linkedin';
  enabled: boolean;
  private li_at: string;

  constructor(options: LinkedInPluginOptions = {}) {
    this.enabled = options.enabled ?? true;
    this.li_at = options.li_at ?? process.env.COOKIE_LI_AT ?? '';
    if (!this.li_at) {
      throw new Error('LinkedIn cookie (li_at) is required');
    }
  }

  async initialize(): Promise<void> {}

  async beforeEach(page: Page): Promise<void> {
    await page.context().addCookies([
      {
        name: 'li_at',
        value: this.li_at,
        domain: '.linkedin.com',
        path: '/',
      },
    ]);
  }

  async evaluate(page: Page): Promise<Record<'linkedin', LinkedInMetrics>> {
    const metrics = await page.evaluate(() => {
      // Get all meta tags
      const metaTags: Record<string, string> = {};
      document.querySelectorAll('meta').forEach((meta) => {
        const name = meta.getAttribute('name') || meta.getAttribute('property');
        const content = meta.getAttribute('content');
        if (name && content) {
          metaTags[name] = content;
        }
      });

      return {
        title: document.title,
        metaTags,
      };
    });

    return { linkedin: metrics };
  }

  async summarize(
    pages: Array<Record<'linkedin', LinkedInMetrics>>,
  ): Promise<Record<'linkedin', LinkedInMetrics>> {
    // For LinkedIn, we'll just return the first page's metrics since we're typically crawling single profiles
    return pages[0] || { linkedin: { title: '', metaTags: {} } };
  }
}
