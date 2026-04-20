import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { applyPurchaseToTeamByEmail, PLAN_CONFIG, type PlanKey } from "@/lib/database";

type LemonWebhookPayload = {
  meta?: {
    event_name?: string;
    custom_data?: {
      plan?: string;
      email?: string;
    };
  };
  data?: {
    id?: string;
    attributes?: {
      status?: string;
      user_email?: string;
      first_order_item?: {
        variant_name?: string;
        product_name?: string;
      };
      custom_data?: {
        plan?: string;
        email?: string;
      };
    };
  };
};

function signatureMatches(secret: string, payload: string, signature: string): boolean {
  const digest = createHmac("sha256", secret).update(payload).digest("hex");

  const left = Buffer.from(digest);
  const right = Buffer.from(signature);

  if (left.length !== right.length) {
    return false;
  }

  return timingSafeEqual(left, right);
}

function inferPlan(payload: LemonWebhookPayload): PlanKey {
  const customPlan = payload.meta?.custom_data?.plan ?? payload.data?.attributes?.custom_data?.plan;
  if (customPlan === "growth") {
    return "growth";
  }

  const variantName = payload.data?.attributes?.first_order_item?.variant_name?.toLowerCase() ?? "";
  if (variantName.includes("15") || variantName.includes("growth") || variantName.includes("pro")) {
    return "growth";
  }

  return "starter";
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const secret = process.env.LEMON_SQUEEZY_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret is missing" }, { status: 500 });
  }

  const signature = request.headers.get("x-signature") ?? "";
  if (!signature) {
    return NextResponse.json({ error: "Missing webhook signature" }, { status: 401 });
  }

  const raw = await request.text();
  if (!signatureMatches(secret, raw, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: LemonWebhookPayload;
  try {
    payload = JSON.parse(raw) as LemonWebhookPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const eventName = payload.meta?.event_name ?? "unknown";
  if (!["order_created", "subscription_created", "subscription_payment_success"].includes(eventName)) {
    return NextResponse.json({ ok: true, ignored: true, eventName });
  }

  const email =
    payload.data?.attributes?.user_email ?? payload.meta?.custom_data?.email ?? payload.data?.attributes?.custom_data?.email;

  if (!email) {
    return NextResponse.json({ error: "Could not determine purchaser email" }, { status: 400 });
  }

  const plan = inferPlan(payload);
  const config = PLAN_CONFIG[plan];

  const orderId = payload.data?.id ?? `webhook-${Date.now()}`;
  const activation = applyPurchaseToTeamByEmail({
    email,
    lemonOrderId: orderId,
    plan,
    seats: config.seats,
    monthlyLimitPerSeat: config.monthlyLimitPerSeat,
    status: payload.data?.attributes?.status ?? "paid",
    payloadJson: raw
  });

  return NextResponse.json({
    ok: true,
    eventName,
    email,
    plan,
    activated: activation.activated,
    teamId: activation.teamId
  });
}
