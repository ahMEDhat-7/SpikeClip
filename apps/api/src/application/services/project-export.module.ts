import { Module } from "@nestjs/common";
import { ProjectExportService } from "./project-export.service";
import { PrismaProjectSourceRepository } from "../../infrastructure/database/repositories/prisma-project-source.repository";
import { PrismaProjectSceneRepository } from "../../infrastructure/database/repositories/prisma-project-scene.repository";
import { PrismaGeneratedClipRepository } from "../../infrastructure/database/repositories/prisma-generated-clip.repository";
import { PrismaProjectRepository } from "../../infrastructure/database/repositories/prisma-project.repository";
import { PrismaUserRepository } from "../../infrastructure/database/repositories/prisma-user.repository";
import { PROJECT_SOURCE_REPOSITORY } from "../../domain/repositories/project-source.repository";
import { PROJECT_SCENE_REPOSITORY } from "../../domain/repositories/project-scene.repository";
import { GENERATED_CLIP_REPOSITORY } from "../../domain/repositories/generated-clip.repository";
import { PROJECT_REPOSITORY } from "../../domain/repositories/project.repository";
import { USER_REPOSITORY } from "../../domain/repositories/user.repository";
import { ExternalModule } from "../../infrastructure/external/external.module";

@Module({
  imports: [ExternalModule],
  providers: [
    ProjectExportService,
    { provide: PROJECT_SOURCE_REPOSITORY, useClass: PrismaProjectSourceRepository },
    { provide: PROJECT_SCENE_REPOSITORY, useClass: PrismaProjectSceneRepository },
    { provide: GENERATED_CLIP_REPOSITORY, useClass: PrismaGeneratedClipRepository },
    { provide: PROJECT_REPOSITORY, useClass: PrismaProjectRepository },
    { provide: USER_REPOSITORY, useClass: PrismaUserRepository },
  ],
  exports: [ProjectExportService],
})
export class ProjectExportModule {}
