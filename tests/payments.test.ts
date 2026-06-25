import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QuickpayClient, AuthError, ValidationError, RateLimitError, NotFoundError, ApiError } from '../src/index.js';
import type { Payment, Paginator } from '../src/index.js';

const FAKE_KEY = 'qpk_live_test1234567890abcdef12345678';

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}) {
    const responseHeaders = new Headers(headers);
    globalThis.fetch = vi.fn().mockResolvedValue({
        ok: status >= 200 && status < 300,
        status,
        statusText: 'OK',
        headers: responseHeaders,
        json: async () => body,
    } as unknown as Response);
}

const samplePayment: Payment = {
    uuid: 'pay-uuid-1',
    merchantOrderId: 'ORDER-001',
    status: 'paid',
    amount: 99.99,
    currency: 'GEL',
    description: 'Test payment',
    gateway: 'bog_card',
    gatewayOrderId: 'gw-123',
    customerName: 'Test User',
    customerEmail: 'test@example.com',
    customerPhone: null,
    paymentUrl: 'https://qpy.ge/p/pay-uuid-1',
    metadata: {},
    paidAt: '2026-06-22T10:00:00Z',
    refundedAt: null,
    refundedAmount: 0,
    createdAt: '2026-06-22T09:55:00Z',
    updatedAt: '2026-06-22T10:00:00Z',
};

describe('Payments.create', () => {
    beforeEach(() => { vi.restoreAllMocks(); });

    it('returns Payment with correct fields', async () => {
        mockFetch(200, samplePayment);
        const client = new QuickpayClient(FAKE_KEY);
        const payment = await client.payments.create({ amount: 99.99, currency: 'GEL' });
        expect(payment.uuid).toBe('pay-uuid-1');
        expect(payment.status).toBe('paid');
        expect(payment.amount).toBe(99.99);
    });

    it('extracts idempotencyKey into Idempotency-Key header and removes it from body', async () => {
        mockFetch(200, samplePayment);
        const client = new QuickpayClient(FAKE_KEY);
        await client.payments.create({
            amount: 99.99,
            currency: 'GEL',
            idempotencyKey: 'my-unique-key',
        });
        const call = vi.mocked(globalThis.fetch).mock.calls[0];
        const options = call?.[1] as RequestInit;
        const headers = options?.headers as Record<string, string>;
        expect(headers?.['Idempotency-Key']).toBe('my-unique-key');
        const body = JSON.parse(options?.body as string) as Record<string, unknown>;
        expect(body).not.toHaveProperty('idempotencyKey');
    });

    it('throws AuthError on 401', async () => {
        mockFetch(401, { error: 'unauthenticated', message: 'Invalid API key.' });
        const client = new QuickpayClient(FAKE_KEY);
        await expect(client.payments.create({ amount: 10 })).rejects.toBeInstanceOf(AuthError);
    });

    it('throws ValidationError with errors on 422', async () => {
        mockFetch(422, {
            error: 'validation_failed',
            message: 'The given data was invalid.',
            errors: { amount: ['The amount field is required.'] },
        });
        const client = new QuickpayClient(FAKE_KEY);
        const err = await client.payments.create({}).catch(e => e) as ValidationError;
        expect(err).toBeInstanceOf(ValidationError);
        expect(err.errors).toHaveProperty('amount');
    });

    it('throws RateLimitError with retryAfter on 429', async () => {
        mockFetch(429, { error: 'rate_limit', message: 'Too many requests.' }, { 'Retry-After': '30' });
        const client = new QuickpayClient(FAKE_KEY);
        const err = await client.payments.create({}).catch(e => e) as RateLimitError;
        expect(err).toBeInstanceOf(RateLimitError);
        expect(err.retryAfter).toBe(30);
    });

    it('throws NotFoundError on 404', async () => {
        mockFetch(404, { error: 'not_found', message: 'Payment not found.' });
        const client = new QuickpayClient(FAKE_KEY);
        await expect(client.payments.get('bad-uuid')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('retries on 503 twice then throws ApiError', async () => {
        vi.useFakeTimers();
        globalThis.fetch = vi.fn().mockResolvedValue({
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers(),
            json: async () => ({ error: 'service_unavailable', message: 'Down.' }),
        } as unknown as Response);

        const client = new QuickpayClient(FAKE_KEY);
        const promise = client.payments.get('some-uuid').catch(e => e);

        // advance past both retry delays
        await vi.runAllTimersAsync();
        const err = await promise;
        expect(err).toBeInstanceOf(ApiError);
        expect(vi.mocked(globalThis.fetch)).toHaveBeenCalledTimes(3);
        vi.useRealTimers();
    });
});

describe('Payments.list', () => {
    beforeEach(() => { vi.restoreAllMocks(); });

    it('returns Paginator<Payment> with hasMore correct', async () => {
        const paginator: Paginator<Payment> = {
            items: [samplePayment],
            total: 1,
            perPage: 15,
            currentPage: 1,
            lastPage: 1,
            hasMore: false,
        };
        mockFetch(200, paginator);
        const client = new QuickpayClient(FAKE_KEY);
        const result = await client.payments.list();
        expect(result.hasMore).toBe(false);
        expect(result.items).toHaveLength(1);
        expect(result.total).toBe(1);
    });
});
