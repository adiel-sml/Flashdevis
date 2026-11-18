import Stripe from 'stripe';
import { describe, expect, it } from 'vitest';
import handler from './stripe-webhook';

process.env.STRIPE_SECRET_KEY = 'sk_test_factice'; process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test';
const appel = (corps: string, signature: string) => {
  const req = { method: 'POST', headers: { 'stripe-signature': signature }, async *[Symbol.asyncIterator]() { yield Buffer.from(corps); } };
  const r = { code: 0, body: null as unknown, status(c: number) { this.code = c; return this; }, json(b: unknown) { this.body = b; }, setHeader() {} };
  return handler(req as never, r as never).then(() => r);
};

describe('webhook Stripe', () => {
  it('refuse un appel qui ne vient pas de Stripe', async () => {
    expect((await appel('{"type":"customer.subscription.updated"}', 't=1,v1=faux')).code).toBe(400);
  });
  it('accepte un événement signé sans rapport avec l’abonnement', async () => {
    const corps = JSON.stringify({ id: 'evt_1', object: 'event', type: 'invoice.paid', data: { object: {} } });
    const sig = new Stripe('sk_test_factice').webhooks.generateTestHeaderString({ payload: corps, secret: 'whsec_test' });
    const r = await appel(corps, sig);
    expect(r.code).toBe(200); expect(r.body).toEqual({ recu: true });
  });
});
