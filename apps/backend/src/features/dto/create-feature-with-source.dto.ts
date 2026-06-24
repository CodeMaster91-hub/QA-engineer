import { IsString, IsNotEmpty, IsOptional, IsIn } from 'class-validator';

export class CreateFeatureWithSourceDto {
  @IsString()
  @IsNotEmpty()
  @IsIn(['text', 'file', 'url'])
  sourceType: 'text' | 'file' | 'url';

  @IsOptional()
  @IsString()
  sourceText?: string;

  @IsOptional()
  @IsString()
  sourceUrl?: string;
}
