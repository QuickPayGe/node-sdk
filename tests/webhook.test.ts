import { describe, it, expect } from 'vitest';
import { createHmac } from 'node:crypto';
import { verifyWebhook, verifyWebhookRaw, QuickpayError } from '../src/index.js';

const SECRET = 'test_webhook_secret_32chars_longXX';

function makeSignature(secret: string, timestamp: number, body: string): string {
    const sig = createHmac('sha256', secret).update(`${timestamp}.${body}`).digest('hex');
    return `t=${timestamp},v1=${sig}`;
}

const NOW = Math.floor(Date.now() / 1000);

const paidPayload = JSON.stringify({
    event: 'payment.paid',
    timestamp: NOW,
    payment: {
        uuid: 'pay-123',
        merchantOrderId: 'ORD-1',
        status: 'paid',
        amount: 50,
        currency: 'GEL',
        description: null,
        gateway: 'bog_card',
        gatewayOrderId: 'gw-1',
        customerName: 'Alice',
        customerEmail: 'alice@example.com',
        customerPhone: null,
        paymentUrl: 'https://qpy.ge/p/pay-123',
        metadata: {},
        paidAt: '2026-06-22T10:00:00Z',
        refundedAt: null,
        refundedAmount: 0,
        createdAt: '2026-06-22T09:55:00Z',
        updatedAt: '2026-06-22T10:00:00Z',
    },
});

const leadPayload = JSON.stringify({
    event: 'lead.submitted',
    timestamp: NOW,
    lead: { name: 'Bob', phone: '595000000' },
});

describe('verifyWebhook', () => {
    it('valid signature returns WebhookEvent', () => {
        const header = makeSignature(SECRET, NOW, paidPayload);
        const event = verifyWebhook(SECRET, paidPayload, header);
        expect(event.type).toBe('payment.paid');
        expect(event.payment).not.toBeNull();
        expect(event.payment?.uuid).toBe('pay-123');
        expect(event.occurredAt).toBeInstanceOf(Date);
    });

    it('wrong HMAC throws QuickpayError', () => {
        const header = makeSignature('wrong-secret', NOW, paidPayload);
        expect(() => verifyWebhook(SECRET, paidPayload, header)).toThrow(QuickpayError);
    });

    it('timestamp older than 300 s throws', () => {
        const old = NOW - 301;
        const header = makeSignature(SECRET, old, paidPayload);
        expect(() => verifyWebhook(SECRET, paidPayload, header)).toThrow(QuickpayError);
    });

    it('malformed header (no t=) throws', () => {
        expect(() => verifyWebhook(SECRET, paidPayload, 'v1=abc123')).toThrow(QuickpayError);
    });

    it('payment.paid event has payment populated', () => {
        const header = makeSignature(SECRET, NOW, paidPayload);
        const event = verifyWebhook(SECRET, paidPayload, header);
        expect(event.payment).not.toBeNull();
        expect(event.payment?.status).toBe('paid');
    });

    it('lead.submitted has payment: null', () => {
        const header = makeSignature(SECRET, NOW, leadPayload);
        const event = verifyWebhook(SECRET, leadPayload, header);
        expect(event.type).toBe('lead.submitted');
        expect(event.payment).toBeNull();
    });
});

describe('verifyWebhookRaw', () => {
    it('returns null on wrong secret instead of throwing', () => {
        const header = makeSignature('wrong-secret', NOW, paidPayload);
        const result = verifyWebhookRaw(SECRET, paidPayload, header);
        expect(result).toBeNull();
    });

    it('returns WebhookEvent on valid signature', () => {
        const header = makeSignature(SECRET, NOW, paidPayload);
        const result = verifyWebhookRaw(SECRET, paidPayload, header);
        expect(result).not.toBeNull();
        expect(result?.type).toBe('payment.paid');
    });
});
