import type { QuickpayClient } from '../client.js';
import type { Gateway } from '../types/index.js';

interface CacheEntry { data: Gateway[]; fetchedAt: number }

const cache = new Map<string, CacheEntry>();
const TTL = 5 * 60 * 1000; // 5 minutes

export class Gateways {
    constructor(private readonly client: QuickpayClient) {}

    async list(): Promise<Gateway[]> {
        const key = this.client.apiKey;
        const cached = cache.get(key);
        if (cached && Date.now() - cached.fetchedAt < TTL) {
            return cached.data;
        }
        const data = await this.client._request<Gateway[]>('GET', '/gateways');
        cache.set(key, { data, fetchedAt: Date.now() });
        return data;
    }
}
