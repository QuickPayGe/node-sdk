# @quickpay/js

Official Quickpay.ge SDK for Node.js / TypeScript.

**Server-side only.** API keys must never be exposed in the browser.  
Requires **Node.js 18+** (uses native `fetch`). Zero runtime dependencies.

## Install

```bash
npm install @quickpay/js
```

## Quick Start

**ESM (recommended)**

```ts
import { QuickpayClient } from '@quickpay/js';

const client = new QuickpayClient(process.env.QUICKPAY_API_KEY!);

const payment = await client.payments.create({
    amount: 49.99,
    currency: 'GEL',
    description: 'Order #1234',
    merchantOrderId: '1234',
    idempotencyKey: 'order-1234-attempt-1', // extracted to Idempotency-Key header
});

console.log(payment.paymentUrl); // redirect your customer here
```

**CommonJS**

```js
const { QuickpayClient } = require('@quickpay/js');

const client = new QuickpayClient(process.env.QUICKPAY_API_KEY);
```

## Resources

### Payments

```ts
// Create
const payment = await client.payments.create({ amount: 49.99, currency: 'GEL' });

// Get
const payment = await client.payments.get('uuid-here');

// List (paginated)
const page = await client.payments.list({ status: 'paid', page: 1 });
// page.items, page.total, page.hasMore

// Refund
const result = await client.payments.refund('uuid-here', 10.00);
```

### Checkout Links

```ts
const link = await client.checkoutLinks.create({ name: 'My Product', amount: 25.00 });
const link = await client.checkoutLinks.get('uuid');
const page  = await client.checkoutLinks.list();
```

### Products

```ts
const product = await client.products.create({ name: 'Widget', price: 9.99 });
const product = await client.products.get('uuid');
const product = await client.products.update('uuid', { price: 14.99 });
const page    = await client.products.list();
```

### Gateways

```ts
const gateways = await client.gateways.list(); // cached 5 min per API key
```

## Webhooks

Verify the `QUICKPAY-SIGNATURE` header before processing any event.

**Express**

```ts
import express from 'express';
import { verifyWebhook, QuickpayError } from '@quickpay/js';

const app = express();
app.use(express.json());

app.post('/webhooks/quickpay', (req, res) => {
    const rawBody = JSON.stringify(req.body); // or use raw body middleware
    const signature = req.headers['quickpay-signature'] as string;

    let event;
    try {
        event = verifyWebhook(process.env.QUICKPAY_WEBHOOK_SECRET!, rawBody, signature);
    } catch (err) {
        return res.status(400).json({ error: 'Invalid signature' });
    }

    if (event.type === 'payment.paid' && event.payment) {
        console.log('Payment paid:', event.payment.uuid);
    }

    res.sendStatus(200);
});
```

**Next.js App Router**

```ts
// app/api/webhooks/quickpay/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhookRaw } from '@quickpay/js';

export async function POST(req: NextRequest) {
    const rawBody = await req.text();
    const signature = req.headers.get('quickpay-signature') ?? '';

    const event = verifyWebhookRaw(process.env.QUICKPAY_WEBHOOK_SECRET!, rawBody, signature);
    if (!event) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    if (event.type === 'payment.paid' && event.payment) {
        console.log('Payment paid:', event.payment.uuid);
    }

    return NextResponse.json({ ok: true });
}
```

## Error Handling

```ts
import { AuthError, ValidationError, RateLimitError, NotFoundError, ApiError } from '@quickpay/js';

try {
    const payment = await client.payments.get('uuid');
} catch (err) {
    if (err instanceof AuthError)       console.error('Bad API key');
    if (err instanceof ValidationError) console.error('Validation errors:', err.errors);
    if (err instanceof RateLimitError)  console.error('Rate limited, retry after:', err.retryAfter, 's');
    if (err instanceof NotFoundError)   console.error('Not found');
    if (err instanceof ApiError)        console.error('API error', err.httpStatus);
}
```

## Configuration

```ts
const client = new QuickpayClient({
    apiKey: process.env.QUICKPAY_API_KEY!,
    siteDomain: 'mystore.ge',       // sent as X-Site-Domain header
    timeout: 15000,                  // request timeout in ms (default: 30000)
    baseUrl: 'https://api.quickpay.ge/v1', // override for staging
});
```

## TypeScript

All types are exported:

```ts
import type { Payment, CheckoutLink, Product, Gateway, WebhookEvent, Paginator } from '@quickpay/js';
```

## Environment Variables

Never hardcode your API key. Use environment variables:

```bash
QUICKPAY_API_KEY=qpk_live_...
QUICKPAY_WEBHOOK_SECRET=your_webhook_secret
```
