import { createHmac, timingSafeEqual } from 'node:crypto';
import { QuickpayError } from './errors.js';
import type { WebhookEvent, Payment } from './types/index.js';

const MAX_AGE_SECONDS = 300;

function parseHeader(header: string): { timestamp: number; signature: string } {
    const parts = Object.fromEntries(
        header.split(',').map(p => {
            const idx = p.indexOf('=');
            return [p.slice(0, idx), p.slice(idx + 1)];
        }),
    );
    const ts = Number(parts['t']);
    const sig = parts['v1'];
    if (!ts || !sig) {
        throw new QuickpayError('invalid_signature', 400, 'Malformed QUICKPAY-SIGNATURE header');
    }
    return { timestamp: ts, signature: sig };
}

function buildPayload(timestamp: number, rawBody: string): string {
    return `${timestamp}.${rawBody}`;
}

function hydrateEvent(parsed: Record<string, unknown>): WebhookEvent {
    return {
        type: String(parsed['event'] ?? ''),
        data: (parsed as Record<string, unknown>),
        payment: parsed['payment'] ? (parsed['payment'] as Payment) : null,
        occurredAt: new Date(Number(parsed['timestamp'] ?? 0) * 1000),
    };
}

export function verifyWebhook(
    secret: string,
    rawBody: string,
    signatureHeader: string,
): WebhookEvent {
    const { timestamp, signature } = parseHeader(signatureHeader);

    const age = Math.floor(Date.now() / 1000) - timestamp;
    if (age > MAX_AGE_SECONDS || age < -MAX_AGE_SECONDS) {
        throw new QuickpayError('timestamp_too_old', 400, 'Webhook timestamp is too old or too far in the future');
    }

    const expected = createHmac('sha256', secret)
        .update(buildPayload(timestamp, rawBody))
        .digest('hex');

    let match: boolean;
    try {
        match = timingSafeEqual(Buffer.from(expected, 'hex'), Buffer.from(signature, 'hex'));
    } catch {
        match = false;
    }

    if (!match) {
        throw new QuickpayError('invalid_signature', 400, 'Webhook signature does not match');
    }

    const parsed = JSON.parse(rawBody) as Record<string, unknown>;
    return hydrateEvent(parsed);
}

export function verifyWebhookRaw(
    secret: string,
    rawBody: string,
    signatureHeader: string,
): WebhookEvent | null {
    try {
        return verifyWebhook(secret, rawBody, signatureHeader);
    } catch {
        return null;
    }
}
