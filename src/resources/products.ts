import type { QuickpayClient } from '../client.js';
import type { Product, Paginator } from '../types/index.js';

interface ProductFilters {
    page?: number;
    perPage?: number;
    active?: boolean;
}

export class Products {
    constructor(private readonly client: QuickpayClient) {}

    async list(filters?: ProductFilters): Promise<Paginator<Product>> {
        const query = filters ? '?' + new URLSearchParams(filters as unknown as Record<string, string>).toString() : '';
        return this.client._request<Paginator<Product>>('GET', `/products${query}`);
    }

    async get(uuid: string): Promise<Product> {
        return this.client._request<Product>('GET', `/products/${uuid}`);
    }

    async create(data: Record<string, unknown>): Promise<Product> {
        return this.client._request<Product>('POST', '/products', data);
    }

    async update(uuid: string, data: Record<string, unknown>): Promise<Product> {
        return this.client._request<Product>('PUT', `/products/${uuid}`, data);
    }
}
