import type { QuickpayClient } from '../client.js';
import type { Payment, Paginator, RefundResult, PaymentFilters } from '../types/index.js';

export class Payments {
    constructor(private readonly client: QuickpayClient) {}

    async create(data: Record<string, unknown>): Promise<Payment> {
        const { idempotencyKey, ...body } = data as Record<string, unknown> & { idempotencyKey?: string };
        const headers: Record<string, string> = {};
        if (idempotencyKey) {
            headers['Idempotency-Key'] = String(idempotencyKey);
        }
        return this.client._request<Payment>('POST', '/payments', body, headers);
    }

    async get(uuid: string): Promise<Payment> {
        return this.client._request<Payment>('GET', `/payments/${uuid}`);
    }

    async list(filters?: PaymentFilters): Promise<Paginator<Payment>> {
        const query = filters ? '?' + new URLSearchParams(filters as Record<string, string>).toString() : '';
        return this.client._request<Paginator<Payment>>('GET', `/payments${query}`);
    }

    async refund(uuid: string, amount: number, reason?: string): Promise<RefundResult> {
        return this.client._request<RefundResult>('POST', `/payments/${uuid}/refund`, {
            amount,
            ...(reason ? { reason } : {}),
        });
    }
}
