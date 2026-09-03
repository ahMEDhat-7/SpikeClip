import { IsString, IsIn, IsOptional, Matches, IsNotEmpty } from "class-validator";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { PlanTier, BillingInterval } from "@spikeclip/shared";

export class CreateCheckoutSessionDto {
  @ApiProperty({ description: "Subscription plan", enum: [PlanTier.PRO, PlanTier.TEAM] })
  @IsString()
  @IsNotEmpty()
  @IsIn([PlanTier.PRO, PlanTier.TEAM])
  plan!: "pro" | "team";

  @ApiPropertyOptional({ description: "Billing interval", enum: [BillingInterval.MONTHLY, BillingInterval.YEARLY], default: BillingInterval.MONTHLY })
  @IsString()
  @IsOptional()
  @IsIn([BillingInterval.MONTHLY, BillingInterval.YEARLY])
  interval?: "monthly" | "yearly";

  @ApiPropertyOptional({ description: "Success redirect URL (relative)", example: "/dashboard" })
  @IsString()
  @IsOptional()
  @Matches(/^\/[a-zA-Z0-9\-_/?=&]*$/, { message: "successUrl must be a relative URL" })
  successUrl?: string;

  @ApiPropertyOptional({ description: "Cancel redirect URL (relative)", example: "/pricing" })
  @IsString()
  @IsOptional()
  @Matches(/^\/[a-zA-Z0-9\-_/?=&]*$/, { message: "cancelUrl must be a relative URL" })
  cancelUrl?: string;
}

export class CreatePortalSessionDto {
  @ApiPropertyOptional({ description: "Return URL after portal session (relative)", example: "/profile" })
  @IsString()
  @IsOptional()
  @Matches(/^\/[a-zA-Z0-9\-_/?=&]*$/, { message: "returnUrl must be a relative URL" })
  returnUrl?: string;
}
