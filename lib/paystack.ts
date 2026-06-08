import { Paystack } from 'paystack-sdk';

const paystack = new Paystack(process.env.PAYSTACK_SECRET_KEY!);

// Create customer
export async function createCustomer(email: string, firstName: string, lastName: string) {
  return await paystack.customer.create({
    email,
    first_name: firstName,
    last_name: lastName,
  });
}

// Create subscription
export async function createSubscription(customerCode: string, planCode: string) {
  return await paystack.subscription.create({
    customer: customerCode,
    plan: planCode,
  });
}

// Initialize payment for subscription
export async function initializeTransaction(email: string, amount: number, reference: string) {
  return await paystack.transaction.initialize({
    email,
    amount: String(amount * 100), // Convert to kobo
    reference,
    callback_url: `${process.env.NEXT_PUBLIC_BASE_URL}/marketplace`,
  });
}

// Verify transaction
export async function verifyTransaction(reference: string) {
  return await paystack.transaction.verify(reference);
}

// Get plan code based on tier
export function getPlanCode(tier: 'individual' | 'business'): string {
  // These would be created in Paystack dashboard
  return tier === 'individual' ? 'PLAN_INDIVIDUAL_60K' : 'PLAN_BUSINESS_1M';
}

// Calculate subscription amount
export function getSubscriptionAmount(tier: 'individual' | 'business'): number {
  return tier === 'individual' ? 60000 : 1000000;
}

export { paystack };