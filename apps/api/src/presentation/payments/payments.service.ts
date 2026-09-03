import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import Stripe from "stripe";
import { UserRepository, USER_REPOSITORY } from "../../domain/repositories/user.repository";
import { Inject } from "@nestjs/common";
import { PlanTier, type PlanTierValue, PLAN_LIMITS, BillingInterval } from "@spikeclip/shared";

const PLAN_PRICES: Record<string, { monthly: string; yearly: string }> = {
  [PlanTier.PRO]: {
    monthly: process.env.STRIPE_PRO_MONTHLY_PRICE_ID || "price_pro_monthly",
    yearly: process.env.STRIPE_PRO_YEARLY_PRICE_ID || "price_pro_yearly",
  },
  [PlanTier.TEAM]: {
    monthly: process.env.STRIPE_TEAM_MONTHLY_PRICE_ID || "price_team_monthly",
    yearly: process.env.STRIPE_TEAM_YEARLY_PRICE_ID || "price_team_yearly",
  },
};

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private readonly stripe: Stripe | null;

  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository
  ) {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      this.logger.warn("STRIPE_SECRET_KEY not set — payments disabled");
      this.stripe = null;
      return;
    }
    try {
      this.stripe = new Stripe(secretKey, {
        apiVersion: "2026-06-24.dahlia",
      });
    } catch (err) {
      this.logger.error(`Failed to initialize Stripe: ${err instanceof Error ? err.message : err}`);
      this.stripe = null;
    }
  }

  async createCheckoutSession(
    userId: string,
    email: string,
    plan: "pro" | "team",
    interval: "monthly" | "yearly" = BillingInterval.MONTHLY,
    successUrl?: string,
    cancelUrl?: string
  ): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new BadRequestException("Stripe is not configured");
    }

    let user = await this.userRepository.findById(userId);
    if (!user) throw new BadRequestException("User not found");

    let customerId = user.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      customerId = customer.id;
      await this.userRepository.update(userId, { stripeCustomerId: customerId });
    }

    const priceId = PLAN_PRICES[plan][interval];
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

    const session = await this.stripe.checkout.sessions.create(
      {
        customer: customerId,
        mode: "subscription",
        line_items: [{ price: priceId, quantity: 1 }],
        success_url: successUrl
          ? `${frontendUrl}${successUrl}`
          : `${frontendUrl}/dashboard?upgraded=true`,
        cancel_url: cancelUrl
          ? `${frontendUrl}${cancelUrl}`
          : `${frontendUrl}/pricing`,
        metadata: { userId: user.id, plan },
      },
      { idempotencyKey: `checkout_${user.id}_${plan}_${interval}` }
    );

    this.logger.log(`Checkout session created for user ${userId}: ${session.id}`);

    return { url: session.url! };
  }

  async createPortalSession(userId: string, returnUrl?: string): Promise<{ url: string }> {
    if (!this.stripe) {
      throw new BadRequestException("Stripe is not configured");
    }

    const user = await this.userRepository.findById(userId);
    if (!user?.stripeCustomerId) {
      throw new BadRequestException("No Stripe customer found");
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url:
        returnUrl || `${process.env.FRONTEND_URL || "http://localhost:3000"}/dashboard`,
    });

    this.logger.log(`Portal session created for user ${userId}`);

    return { url: session.url };
  }

  async handleWebhook(event: Stripe.Event): Promise<void> {
    if (!this.stripe) {
      this.logger.warn("Stripe not configured — ignoring webhook event");
      return;
    }
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const plan = session.metadata?.plan;
        if (userId && plan) {
          await this.activatePlan(userId, plan as string);
        }
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          const status = subscription.status;
          if (status === "active") {
            const priceId = subscription.items.data[0]?.price?.id;
            const plan = this.resolvePlanFromPriceId(priceId);
            if (plan) await this.activatePlan(userId, plan);
          } else if (status === "canceled" || status === "unpaid") {
            await this.deactivatePlan(userId);
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const userId = subscription.metadata?.userId;
        if (userId) {
          await this.deactivatePlan(userId);
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const user = await this.userRepository.findByStripeCustomerId(customerId);
        if (user) {
          this.logger.warn(`Payment failed for user ${user.id}`);
        }
        break;
      }
      default:
        this.logger.debug(`Unhandled Stripe event: ${event.type}`);
    }
  }

  verifyWebhookSignature(payload: Buffer | string, sig: string, secret: string): Stripe.Event {
    if (!this.stripe) {
      throw new BadRequestException("Stripe is not configured");
    }
    return this.stripe.webhooks.constructEvent(payload, sig, secret);
  }

  private async activatePlan(userId: string, plan: string): Promise<void> {
    const limits = PLAN_LIMITS[plan as keyof typeof PLAN_LIMITS];
    if (!limits) return;

    await this.userRepository.update(userId, {
      plan: plan as PlanTierValue,
      analysesLimit: limits.analysesLimit,
      scenesLimit: limits.scenesLimit,
    });

    this.logger.log(`Plan activated: user=${userId}, plan=${plan}`);
  }

  private async deactivatePlan(userId: string): Promise<void> {
    const limits = PLAN_LIMITS[PlanTier.FREE];
    await this.userRepository.update(userId, {
      plan: PlanTier.FREE,
      analysesLimit: limits.analysesLimit,
      scenesLimit: limits.scenesLimit,
      clipsLimit: limits.clipsLimit,
    });

    this.logger.log(`Plan deactivated to free: user=${userId}`);
  }

  private resolvePlanFromPriceId(priceId?: string): string | null {
    if (!priceId) return null;
    for (const [plan, prices] of Object.entries(PLAN_PRICES)) {
      if (prices.monthly === priceId || prices.yearly === priceId) return plan;
    }
    return null;
  }
}
