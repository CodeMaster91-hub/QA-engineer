import { IsString, IsNotEmpty, IsObject, IsEnum } from 'class-validator';
import { ArtifactType } from '../feature-artifact.entity';

export class CreateArtifactDto {
  @IsEnum(ArtifactType)
  @IsNotEmpty()
  type: ArtifactType;

  @IsObject()
  @IsNotEmpty()
  content: Record<string, any>;
}
