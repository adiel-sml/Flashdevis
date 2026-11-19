import { describe, expect, it } from 'vitest';
import { clientExiste } from './abonnement';

const stripe = (retrieve: () => Promise<unknown>) => ({ customers: { retrieve } }) as never;
describe('client Stripe', () => {
  it('un client de l’autre mode (test ↔ live) ou supprimé est considéré absent', async () => {
    expect(await clientExiste(stripe(() => Promise.reject(Object.assign(new Error('No such customer'), { code: 'resource_missing' }))), 'cus_test')).toBe(false);
    expect(await clientExiste(stripe(() => Promise.resolve({ id: 'cus_1', deleted: true })), 'cus_1')).toBe(false);
    expect(await clientExiste(stripe(() => Promise.resolve({ id: 'cus_1' })), 'cus_1')).toBe(true);
  });
  it('une panne de Stripe n’est pas prise pour un client absent', async () => {
    await expect(clientExiste(stripe(() => Promise.reject(Object.assign(new Error('timeout'), { code: 'api_connection_error' }))), 'cus_1')).rejects.toThrow('timeout');
  });
});
