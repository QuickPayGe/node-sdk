export interface Payment {
    uuid: string;
    merchantOrderId: string | null;
    status: string;
    amount: number;
    currency: string;
    description: string | null;
    gateway: string | null;
    gatewayOrderId: string | null;
    customerName: string | null;
    customerEmail: string | null;
    customerPhone: string | null;
    paymentUrl: string;
    metadata: Record<string, unknown>;
    paidAt: string | null;
    refundedAt: string | null;
    refundedAmount: number;
    createdAt: string;
    updatedAt: string;
}

export interface CheckoutLink {
    uuid: string;
    name: string;
    amount: number | null;
    currency: string;
    description: string | null;
    url: string;
    active: boolean;
    expiresAt: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface Product {
    uuid: string;
    name: string;
    price: number;
    currency: string;
    description: string | null;
    imageUrl: string | null;
    active: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface Gateway {
    slug: string;
    name: string;
    active: boolean;
    supportsInstallments: boolean;
    supportsSubscriptions: boolean;
}

export interface RefundResult {
    success: boolean;
    refundedAmount: number;
    currency: string;
    message: string | null;
}

export interface Paginator<T> {
    items: T[];
    total: number;
    perPage: number;
    currentPage: number;
    lastPage: number;
    hasMore: boolean;
}

export interface WebhookEvent {
    type: string;
    data: Record<string, unknown>;
    payment: Payment | null;
    occurredAt: Date;
}

export interface QuickpayConfig {
    apiKey: string;
    baseUrl?: string;
    timeout?: number;
    siteDomain?: string;
}

export interface PaymentFilters {
    status?: string;
    gateway?: string;
    page?: number;
    perPage?: number;
    dateFrom?: string;
    dateTo?: string;
}
