import Stripe from "stripe";

export async function sendCheckoutCompletedWebhook(params: {
  baseUrl: string;
  webhookSecret: string;
  enrollmentId: string;
  courseId: string;
  customerId: string;
  amountTotal?: number;
}) {
  const event = {
    id: `evt_e2e_${Date.now()}`,
    object: "event",
    type: "checkout.session.completed",
    data: {
      object: {
        id: `cs_e2e_${Date.now()}`,
        object: "checkout.session",
        amount_total: params.amountTotal ?? 14900,
        customer: params.customerId,
        metadata: {
          courseId: params.courseId,
          enrollmentId: params.enrollmentId,
        },
      },
    },
  };

  const payload = JSON.stringify(event);
  const stripe = new Stripe("sk_test_e2e_placeholder", {
    apiVersion: "2025-08-27.basil",
  });
  const signature = stripe.webhooks.generateTestHeaderString({
    payload,
    secret: params.webhookSecret,
  });

  const response = await fetch(`${params.baseUrl}/api/webhook/stripe`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "stripe-signature": signature,
    },
    body: payload,
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Webhook failed (${response.status}): ${body}`);
  }

  return response;
}
