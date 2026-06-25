import { AuthError, ValidationError, RateLimitError, NotFoundError, ApiError, QuickpayError } from './errors.js';
import type { QuickpayConfig } from './types/index.js';
import { Payments } from './resources/payments.js';
import { CheckoutLinks } from './resources/checkoutLinks.js';
import { Products } from './resources/products.js';
import { Gateways } from './resources/gateways.js';

const DEFAULT_BASE_URL = 'https://api.quickpay.ge/v1';
const SDK_VERSION = '1.0.0';
const RETRY_DELAYS = [2000, 4000];

export class QuickpayClient {
    readonly apiKey: string;
    readonly baseUrl: string;
    readonly timeout: number;
    readonly siteDomain: string;

    private _payments?: Payments;
    private _checkoutLinks?: CheckoutLinks;
    private _products?: Products;
    private _gateways?: Gateways;

    constructor(config: QuickpayConfig | string) {
        const resolved: QuickpayConfig = typeof config === 'string' ? { apiKey: config } : config;
        this.apiKey = resolved.apiKey;
        this.baseUrl = (resolved.baseUrl ?? DEFAULT_BASE_URL).replace(/\/$/, '');
        this.timeout = resolved.timeout ?? 30000;
        this.siteDomain = resolved.siteDomain ?? '';
    }

    get payments(): Payments {
        this._payments ??= new Payments(this);
        return this._payments;
    }

    get checkoutLinks(): CheckoutLinks {
        this._checkoutLinks ??= new CheckoutLinks(this);
        return this._checkoutLinks;
    }

    get products(): Products {
        this._products ??= new Products(this);
        return this._products;
    }

    get gateways(): Gateways {
        this._gateways ??= new Gateways(this);
        return this._gateways;
    }

    async _request<T>(
        method: string,
        path: string,
        data?: Record<string, unknown>,
        extraHeaders?: Record<string, string>,
    ): Promise<T> {
        const url = `${this.baseUrl}${path}`;
        const headers: Record<string, string> = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': `quickpay-js/${SDK_VERSION}`,
            ...extraHeaders,
        };
        if (this.siteDomain) {
            headers['X-Site-Domain'] = this.siteDomain;
        }

        const body = data !== undefined ? JSON.stringify(data) : undefined;
        let attempt = 0;

        while (true) {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), this.timeout);

            let response: Response;
            try {
                response = await fetch(url, { method, headers, body, signal: controller.signal });
            } finally {
                clearTimeout(timer);
            }

            if (response.ok) {
                return await response.json() as T;
            }

            const isRetryable = response.status >= 500 && attempt < RETRY_DELAYS.length;
            if (isRetryable) {
                await new Promise(r => setTimeout(r, RETRY_DELAYS[attempt]!));
                attempt++;
                continue;
            }

            let payload: Record<string, unknown> = {};
            try {
                payload = await response.json() as Record<string, unknown>;
            } catch {
                // non-JSON error body
            }

            const errorCode = String(payload['error'] ?? 'api_error');
            const message = String(payload['message'] ?? response.statusText);

            switch (response.status) {
                case 401:
                case 403:
                    throw new AuthError(errorCode, response.status, message);
                case 422: {
                    const errors = (payload['errors'] as Record<string, string[]>) ?? {};
                    throw new ValidationError(errorCode, response.status, message, errors);
                }
                case 429: {
                    const retryAfter = Number(response.headers.get('Retry-After') ?? 60);
                    throw new RateLimitError(errorCode, response.status, message, retryAfter);
                }
                case 404:
                    throw new NotFoundError(errorCode, response.status, message);
                default:
                    throw new ApiError(errorCode, response.status, message);
            }
        }
    }
}
