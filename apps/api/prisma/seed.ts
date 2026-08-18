import { PrismaClient } from "@prisma/client";
import { randomUUID, createHmac } from "crypto";

const prisma = new PrismaClient();

const TEST_USER = {
  id: randomUUID(),
  email: "test@spikeclip.dev",
  name: "Test User",
  oauthProvider: "google",
  oauthProviderId: "test-google-id-12345",
  plan: "free",
  analysesLimit: 3,
  scenesLimit: 3,
};

function signJwt(payload: Record<string, string>, secret: string, expiresInSec = 86400): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const body = Buffer.from(
    JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec })
  ).toString("base64url");
  const signature = createHmac("sha256", secret).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${signature}`;
}

async function main() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("JWT_SECRET not set in environment");
    process.exit(1);
  }

  const user = await prisma.user.upsert({
    where: { email: TEST_USER.email },
    update: {
      plan: TEST_USER.plan,
      analysesLimit: TEST_USER.analysesLimit,
      scenesLimit: TEST_USER.scenesLimit,
    },
    create: TEST_USER,
  });

  const token = signJwt({ sub: user.id, email: user.email }, secret);

  console.log("");
  console.log("=== Test User Created ===");
  console.log(`  ID:    ${user.id}`);
  console.log(`  Email: ${user.email}`);
  console.log(`  Plan:  ${user.plan}`);
  console.log("");
  console.log("=== JWT Token (24h expiry) ===");
  console.log(`  ${token}`);
  console.log("");
  console.log("=== Test Checkout ===");
  console.log(`  curl -X POST http://localhost:3001/api/payments/checkout \\`);
  console.log(`    -H "Content-Type: application/json" \\`);
  console.log(`    -H "Authorization: Bearer ${token}" \\`);
  console.log(`    -d '{"plan":"pro","interval":"monthly"}'`);
  console.log("");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
