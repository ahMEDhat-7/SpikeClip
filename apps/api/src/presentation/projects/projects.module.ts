import { Module } from "@nestjs/common";
import { ProjectController } from "./project.controller";
import { SourceController } from "./source.controller";
import { SceneController } from "./scene.controller";
import { ClipController } from "./clip.controller";
import { ProjectService } from "./project.service";
import { SourceService } from "./source.service";
import { SceneService } from "./scene.service";
import { ClipService } from "./clip.service";
import { PrismaProjectRepository } from "../../infrastructure/database/repositories/prisma-project.repository";
import { PrismaProjectSourceRepository } from "../../infrastructure/database/repositories/prisma-project-source.repository";
import { PrismaProjectSceneRepository } from "../../infrastructure/database/repositories/prisma-project-scene.repository";
import { PrismaGeneratedClipRepository } from "../../infrastructure/database/repositories/prisma-generated-clip.repository";
import { PrismaYoutubeConnectionRepository } from "../../infrastructure/database/repositories/prisma-youtube-connection.repository";
import { PROJECT_REPOSITORY } from "../../domain/repositories/project.repository";
import { PROJECT_SOURCE_REPOSITORY } from "../../domain/repositories/project-source.repository";
import { PROJECT_SCENE_REPOSITORY } from "../../domain/repositories/project-scene.repository";
import { GENERATED_CLIP_REPOSITORY } from "../../domain/repositories/generated-clip.repository";
import { YOUTUBE_CONNECTION_REPOSITORY } from "../../domain/repositories/youtube-connection.repository";
import { YoutubeModule } from "../../infrastructure/youtube/youtube.module";
import { ExternalModule } from "../../infrastructure/external/external.module";
import { SceneGenerationModule } from "../../application/services/scene-generation.module";

@Module({
  imports: [YoutubeModule, SceneGenerationModule, ExternalModule],
  controllers: [ProjectController, SourceController, SceneController, ClipController],
  providers: [
    ProjectService,
    SourceService,
    SceneService,
    ClipService,
    { provide: PROJECT_REPOSITORY, useClass: PrismaProjectRepository },
    { provide: PROJECT_SOURCE_REPOSITORY, useClass: PrismaProjectSourceRepository },
    { provide: PROJECT_SCENE_REPOSITORY, useClass: PrismaProjectSceneRepository },
    { provide: GENERATED_CLIP_REPOSITORY, useClass: PrismaGeneratedClipRepository },
    { provide: YOUTUBE_CONNECTION_REPOSITORY, useClass: PrismaYoutubeConnectionRepository },
  ],
  exports: [ProjectService, SourceService, SceneService, ClipService],
})
export class ProjectsModule {}
