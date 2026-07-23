import { ApiProperty } from "@nestjs/swagger";

export class UserResponseDto {
  @ApiProperty({ description: "User ID", example: "550e8400-e29b-41d4-a716-446655440000" })
  id!: string;

  @ApiProperty({ description: "User email", example: "user@example.com" })
  email!: string;

  @ApiProperty({ description: "Display name", example: "John Doe", required: false })
  name?: string;

  @ApiProperty({ description: "Plan tier", example: "free", enum: ["free", "pro", "team"] })
  plan!: string;

  @ApiProperty({ description: "Analyses used this month", example: 1 })
  analysesUsed!: number;

  @ApiProperty({ description: "Monthly analyses limit", example: 3 })
  analysesLimit!: number;

  @ApiProperty({ description: "Maximum scenes per analysis", example: 3 })
  scenesLimit!: number;

  @ApiProperty({ description: "Clips exported this month", example: 0 })
  clipsUsed!: number;

  @ApiProperty({ description: "Monthly clip export limit", example: 2 })
  clipsLimit!: number;

  @ApiProperty({ description: "Account creation timestamp", example: "2026-01-15T10:30:00.000Z" })
  createdAt!: Date;
}
