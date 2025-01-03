import type { Page } from 'playwright';
import type { CrawlerPlugin, PluginConstructorOptions } from '../types/plugin';
import type { CrawlJob } from '../types.improved';

interface ContentMetrics {
  title: string;
  description: string | null;
  wordCount: number;
  headings: {
    h1: number;
    h2: number;
    h3: number;
  };
  images: number;
  links: {
    internal: number;
    external: number;
  };
}

interface ContentSummary {
  totalPages: number;
  averageWordCount: number;
  totalImages: number;
  totalLinks: {
    internal: number;
    external: number;
  };
  missingMetadata: {
    title: number;
    description: number;
  };
}

export class ContentPlugin
  implements CrawlerPlugin<'content', ContentMetrics, ContentSummary>
{
  readonly name = 'content';
  enabled: boolean;

  constructor(options: PluginConstructorOptions = {}) {
    this.enabled = options.enabled ?? true;
  }

  async initialize(): Promise<void> {
    // No initialization needed
  }

  async beforeCrawl(job: CrawlJob): Promise<void> {
    console.log(`Starting content analysis for ${job.config.url}`);
  }

  async afterCrawl(job: CrawlJob): Promise<void> {
    console.log(`Completed content analysis for ${job.config.url}`);
  }

  async beforeEach(page: Page): Promise<void> {
    // Add any custom scripts or styles needed for content analysis
    await page.addScriptTag({
      content: `
        window.__contentAnalysis = {
          startTime: Date.now(),
          logs: []
        };
      `,
    });
  }

  async afterEach(page: Page): Promise<void> {
    // Clean up any custom scripts or data
    await page.evaluate(() => {
      delete (window as any).__contentAnalysis;
    });
  }

  async evaluate(page: Page): Promise<Record<'content', ContentMetrics>> {
    const metrics = await page.evaluate(() => {
      // Helper to count words in text
      const countWords = (text: string): number => {
        return text.trim().split(/\s+/).filter(Boolean).length;
      };

      // Get base URL for internal/external link detection
      const baseUrl = window.location.origin;

      // Analyze links
      const links = Array.from(document.getElementsByTagName('a'));
      const linkAnalysis = links.reduce(
        (acc, link) => {
          const href = link.href;
          if (href.startsWith(baseUrl)) {
            acc.internal++;
          } else if (href.startsWith('http')) {
            acc.external++;
          }
          return acc;
        },
        { internal: 0, external: 0 },
      );

      return {
        title: document.title,
        description:
          document
            .querySelector('meta[name="description"]')
            ?.getAttribute('content') || null,
        wordCount: countWords(document.body.textContent || ''),
        headings: {
          h1: document.getElementsByTagName('h1').length,
          h2: document.getElementsByTagName('h2').length,
          h3: document.getElementsByTagName('h3').length,
        },
        images: document.getElementsByTagName('img').length,
        links: linkAnalysis,
      };
    });

    return { content: metrics };
  }

  async summarize(
    pages: Array<Record<'content', ContentMetrics>>,
  ): Promise<Record<'content', ContentSummary>> {
    const totalPages = pages.length;
    if (totalPages === 0) {
      return {
        content: {
          totalPages: 0,
          averageWordCount: 0,
          totalImages: 0,
          totalLinks: { internal: 0, external: 0 },
          missingMetadata: { title: 0, description: 0 },
        },
      };
    }

    const summary = pages.reduce(
      (acc, page) => {
        const metrics = page.content;
        acc.totalWordCount += metrics.wordCount;
        acc.totalImages += metrics.images;
        acc.totalLinks.internal += metrics.links.internal;
        acc.totalLinks.external += metrics.links.external;
        if (!metrics.title) acc.missingMetadata.title++;
        if (!metrics.description) acc.missingMetadata.description++;
        return acc;
      },
      {
        totalWordCount: 0,
        totalImages: 0,
        totalLinks: { internal: 0, external: 0 },
        missingMetadata: { title: 0, description: 0 },
      },
    );

    return {
      content: {
        totalPages,
        averageWordCount: Math.round(summary.totalWordCount / totalPages),
        totalImages: summary.totalImages,
        totalLinks: summary.totalLinks,
        missingMetadata: summary.missingMetadata,
      },
    };
  }
}
