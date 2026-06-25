import type { QuickpayClient } from '../client.js';
import type { CheckoutLink, Paginator } from '../types/index.js';

interface CheckoutLinkFilters {
    page?: number;
    perPage?: number;
    active?: boolean;
}

export class CheckoutLinks {
    constructor(private readonly client: QuickpayClient) {}

    async create(data: Record<string, unknown>): Promise<CheckoutLink> {
        return this.client._request<CheckoutLink>('POST', '/checkout-links', data);
    }

    async get(uuid: string): Promise<CheckoutLink> {
        return this.client._request<CheckoutLink>('GET', `/checkout-links/${uuid}`);
    }

    async list(filters?: CheckoutLinkFilters): Promise<Paginator<CheckoutLink>> {
        const query = filters ? '?' + new URLSearchParams(filters as unknown as Record<string, string>).toString() : '';
        return this.client._request<Paginator<CheckoutLink>>('GET', `/checkout-links${query}`);
    }
}
