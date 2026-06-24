import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDFParse } from 'pdf-parse';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';
import { parse as csvParse } from 'csv-parse/sync';

export interface ProcessedFile {
  text: string;
  images: Array<{ data: string; mimeType: string; name: string }>;
  metadata: Record<string, any>;
}

@Injectable()
export class FileProcessorService {
  private readonly logger = new Logger(FileProcessorService.name);
  private readonly maxFileSize: number;
  private readonly supportedTypes = [
    'pdf',
    'docx',
    'xlsx',
    'csv',
    'txt',
    'md',
  ];

  constructor(private configService: ConfigService) {
    this.maxFileSize = this.configService.get<number>(
      'MAX_FILE_SIZE',
      10 * 1024 * 1024,
    );
  }

  async processFile(
    buffer: Buffer,
    originalname: string,
  ): Promise<ProcessedFile> {
    if (buffer.length > this.maxFileSize) {
      throw new BadRequestException(
        `File size exceeds limit of ${this.maxFileSize / 1024 / 1024}MB`,
      );
    }

    const ext = originalname.split('.').pop()?.toLowerCase();
    if (!ext || !this.supportedTypes.includes(ext)) {
      throw new BadRequestException(
        `Unsupported file type: ${ext}. Supported: ${this.supportedTypes.join(', ')}`,
      );
    }

    this.logger.log(`Processing file: ${originalname} (${ext})`);

    switch (ext) {
      case 'pdf':
        return this.processPdf(buffer, originalname);
      case 'docx':
        return this.processDocx(buffer, originalname);
      case 'xlsx':
        return this.processXlsx(buffer, originalname);
      case 'csv':
        return this.processCsv(buffer, originalname);
      case 'txt':
      case 'md':
        return this.processText(buffer, originalname);
      default:
        throw new BadRequestException(`Unsupported file type: ${ext}`);
    }
  }

  private async processPdf(
    buffer: Buffer,
    filename: string,
  ): Promise<ProcessedFile> {
    try {
      const pdf = new PDFParse({ data: new Uint8Array(buffer) });
      const textResult = await pdf.getText();
      const info = await pdf.getInfo();
      return {
        text: textResult.text || '',
        images: [],
        metadata: {
          filename,
          type: 'pdf',
          pages: info?.pages || 0,
          info: info,
        },
      };
    } catch (error) {
      this.logger.error(`PDF processing failed: ${error.message}`);
      throw new BadRequestException(`Failed to process PDF: ${error.message}`);
    }
  }

  private async processDocx(
    buffer: Buffer,
    filename: string,
  ): Promise<ProcessedFile> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return {
        text: result.value,
        images: [],
        metadata: {
          filename,
          type: 'docx',
          warnings: result.messages
            .filter((m) => m.type === 'warning')
            .map((m) => m.message),
        },
      };
    } catch (error) {
      this.logger.error(`DOCX processing failed: ${error.message}`);
      throw new BadRequestException(`Failed to process DOCX: ${error.message}`);
    }
  }

  private processXlsx(buffer: Buffer, filename: string): ProcessedFile {
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      const allText: string[] = [];

      for (const sheetName of workbook.SheetNames) {
        const sheet = workbook.Sheets[sheetName];
        const csvData = XLSX.utils.sheet_to_csv(sheet);
        if (csvData.trim()) {
          allText.push(`=== Sheet: ${sheetName} ===\n${csvData}`);
        }
      }

      return {
        text: allText.join('\n\n'),
        images: [],
        metadata: {
          filename,
          type: 'xlsx',
          sheets: workbook.SheetNames,
        },
      };
    } catch (error) {
      this.logger.error(`XLSX processing failed: ${error.message}`);
      throw new BadRequestException(`Failed to process XLSX: ${error.message}`);
    }
  }

  private processCsv(buffer: Buffer, filename: string): ProcessedFile {
    try {
      const content = buffer.toString('utf-8');
      const records = csvParse(content, { columns: true });

      const text = records
        .map((row: Record<string, string>) =>
          Object.entries(row)
            .map(([key, val]) => `${key}: ${val}`)
            .join(', '),
        )
        .join('\n');

      return {
        text,
        images: [],
        metadata: {
          filename,
          type: 'csv',
          rows: records.length,
        },
      };
    } catch (error) {
      this.logger.error(`CSV processing failed: ${error.message}`);
      throw new BadRequestException(`Failed to process CSV: ${error.message}`);
    }
  }

  private processText(buffer: Buffer, filename: string): ProcessedFile {
    const text = buffer.toString('utf-8');
    return {
      text,
      images: [],
      metadata: {
        filename,
        type: filename.endsWith('.md') ? 'markdown' : 'text',
        size: buffer.length,
      },
    };
  }
}
