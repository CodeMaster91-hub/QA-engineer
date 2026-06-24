import {
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { PipelineStage } from '../agent-config.entity';

export class UpdateAgentConfigDto {
  @IsOptional()
  @IsString()
  alias?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(2)
  temperature?: number;

  @IsOptional()
  @IsNumber()
  @Min(256)
  @Max(131072)
  maxTokens?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}
