import { Module } from "@nestjs/common";
import { PatternPresetService } from "./pattern-preset.service";
import { PrismaModule } from "../../infrastructure/database/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [PatternPresetService],
  exports: [PatternPresetService],
})
export class PatternPresetModule {}
