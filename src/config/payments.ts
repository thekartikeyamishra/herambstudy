/**
 * Payment adapter boundary — NOT ACTIVE in the launch release.
 *
 * The launch site sells nothing. This module defines the interface future
 * integrations (Razorpay for India, PayPal for international customers) must
 * implement, so checkout code never leaks into public pages.
 *
 * Before enabling any provider you MUST implement, server-side only:
 *  1. Order creation with server-computed prices (never trust client amounts).
 *  2. Webhook signature verification (Razorpay: HMAC-SHA256 with the webhook
 *     secret; PayPal: the Verify Webhook Signature API).
 *  3. Idempotency keys on order creation and webhook processing.
 *  4. Reconciliation of provider records vs. internal subscription state.
 *  5. Refund handling consistent with the published refund policy.
 *  6. Subscription state machine (trialing → active → past_due → cancelled).
 *  7. GST-compliant invoicing for Indian customers and tax handling abroad.
 * A client-side "success" redirect is never proof of payment.
 * Payment SDKs must only load on checkout routes, never on every page.
 */

export type PaymentProviderId = "razorpay" | "paypal";

export interface CreateOrderInput {
  planId: string;
  customerId: string;
  currency: "INR" | "USD" | "EUR";
  idempotencyKey: string;
}

export interface PaymentOrder {
  provider: PaymentProviderId;
  providerOrderId: string;
  amountMinor: number;
  currency: string;
}

export interface PaymentProvider {
  id: PaymentProviderId;
  createOrder(input: CreateOrderInput): Promise<PaymentOrder>;
  verifyWebhook(rawBody: string, headers: Headers): Promise<boolean>;
}

export function isPaymentProviderEnabled(id: PaymentProviderId): boolean {
  // Read server-side only. Both remain false until the steps above are complete.
  if (id === "razorpay") return process.env.RAZORPAY_ENABLED === "true";
  return process.env.PAYPAL_ENABLED === "true";
}

/** No provider is implemented yet; calling this is a programming error. */
export function getPaymentProvider(id: PaymentProviderId): never {
  throw new Error(
    `Payment provider "${id}" is not implemented in this release. See src/config/payments.ts.`,
  );
}
