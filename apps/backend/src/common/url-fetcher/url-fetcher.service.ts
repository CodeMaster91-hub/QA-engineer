import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

export interface UrlFetchResult {
  ok: boolean;
  text?: string;
  images?: Array<{ data: string; mimeType: string; url: string; name: string }>;
  metadata?: Record<string, any>;
  error?: string;
}

@Injectable()
export class UrlFetcherService {
  private readonly logger = new Logger(UrlFetcherService.name);

  async validateUrl(url: string): Promise<{ ok: boolean; error?: string }> {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { ok: false, error: 'URL must use http or https protocol' };
      }

      const response = await fetch(url, {
        method: 'HEAD',
        signal: AbortSignal.timeout(10000),
      });

      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('text/')) {
        return { ok: false, error: `Unsupported content type: ${contentType}` };
      }

      return { ok: true };
    } catch (error) {
      return { ok: false, error: error.message };
    }
  }

  async fetchUrl(url: string): Promise<UrlFetchResult> {
    try {
      const parsed = new URL(url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return { ok: false, error: 'URL must use http or https protocol' };
      }

      this.logger.log(`Fetching URL: ${url}`);

      const response = await fetch(url, {
        signal: AbortSignal.timeout(30000),
      });

      if (!response.ok) {
        return { ok: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const html = await response.text();
      const $ = cheerio.load(html);

      $('script, style, nav, footer, header').remove();

      const text = $('body')
        .text()
        .replace(/\s+/g, ' ')
        .trim();

      const images: Array<{ data: string; mimeType: string; url: string; name: string }> = [];
      const imgElements = $('img');

      for (let i = 0; i < imgElements.length && i < 20; i++) {
        const img = imgElements.eq(i);
        const src = img.attr('src');
        if (!src) continue;

        try {
          const imgUrl = new URL(src, url).toString();
          const imgResponse = await fetch(imgUrl, {
            signal: AbortSignal.timeout(10000),
          });

          if (imgResponse.ok) {
            const buffer = Buffer.from(await imgResponse.arrayBuffer());
            const mimeType = imgResponse.headers.get('content-type') || 'image/png';
            const base64 = buffer.toString('base64');
            const name = `image_${i}.${mimeType.split('/')[1] || 'png'}`;

            images.push({ data: base64, mimeType, url: imgUrl, name });
          }
        } catch (imgError) {
          this.logger.warn(`Failed to fetch image: ${src}`);
        }
      }

      return {
        ok: true,
        text,
        images,
        metadata: {
          url,
          title: $('title').text().trim(),
          description: $('meta[name="description"]').attr('content') || '',
          imagesCount: images.length,
        },
      };
    } catch (error) {
      this.logger.error(`URL fetch failed: ${error.message}`);
      return { ok: false, error: error.message };
    }
  }
}
