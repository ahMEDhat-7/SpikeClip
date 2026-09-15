import { Module } from "@nestjs/common";
import { SceneGenerationService } from "./scene-generation.service";
import { ExternalModule } from "../../infrastructure/external/external.module";
import { PrismaProjectSourceRepository } from "../../infrastructure/database/repositories/prisma-project-source.repository";
import { PrismaProjectSceneRepository } from "../../infrastructure/database/repositories/prisma-project-scene.repository";
import { PROJECT_SOURCE_REPOSITORY } from "../../domain/repositories/project-source.repository";
import { PROJECT_SCENE_REPOSITORY } from "../../domain/repositories/project-scene.repository";

@Module({
  imports: [ExternalModule],
  providers: [
    SceneGenerationService,
    {
      provide: PROJECT_SOURCE_REPOSITORY,
      useClass: PrismaProjectSourceRepository,
    },
    {
      provide: PROJECT_SCENE_REPOSITORY,
      useClass: PrismaProjectSceneRepository,
    },
  ],
  exports: [SceneGenerationService],
})
export class SceneGenerationModule {}
