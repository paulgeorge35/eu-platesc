# EuPlatesc Client

A modern TypeScript client for integrating with the EuPlatesc payment gateway. This package provides a robust, type-safe way to process payments and manage transactions through the EuPlatesc platform.

## Features

- 🔒 Type-safe API with comprehensive TypeScript definitions
- 💳 Process payments with support for billing and shipping details
- 🔄 Handle recurring payments and subscriptions
- 📊 Manage transactions (refunds, captures, status checks)
- 💾 Access saved cards and card art
- 📄 Retrieve invoices and transaction reports
- ✅ Built-in response validation and error handling

## Prerequisites

- Node.js 16+ or Bun runtime
- TypeScript 4.x+ (for type definitions)
- npm, yarn, pnpm, or bun package manager

## Installation

Before installing, you need to configure your package manager to access the GitHub Packages registry.

### GitHub Personal Access Token
First, create a GitHub Personal Access Token with the `read:packages` permission. Add it to your package manager's configuration file.

### Via bun

1. Create or edit `$HOME/.bunfig.toml` and add:
```toml
[install.scopes]
"@paulgeorge35" = { token = "your_github_token", url = "https://npm.pkg.github.com/" }
```

2. Install the package:
```bash
bun add @paulgeorge35/eu-platesc@latest
```

### Via npm

1. Create or edit `$HOME/.npmrc` and add:
```
//npm.pkg.github.com/:_authToken=your_github_token
```

2. Install the package:
```bash
npm install @paulgeorge35/eu-platesc@latest
```

### Via yarn

1. Create or edit `$HOME/.yarnrc` and add:
```
//npm.pkg.github.com/:_authToken=your_github_token
```

2. Install the package:
```bash
yarn add @paulgeorge35/eu-platesc@latest
```

### Via pnpm

1. Create or edit `$HOME/.npmrc` and add:
```
//npm.pkg.github.com/:_authToken=your_github_token
```

2. Install the package:
```bash
pnpm add @paulgeorge35/eu-platesc@latest
```

## Dependencies

##### Peer Dependencies
- `node` `(>=16.0.0)` - For crypto module support

##### Built-in Dependencies
- `node:crypto` - Node.js crypto module (included in Node.js runtime)

## Quick Start

```typescript
import { EuPlatescClient } from '@paulgeorge35/eu-platesc';

// Initialize the client
const client = new EuPlatescClient({
  merchantId: 'YOUR_MERCHANT_ID',
  secretKey: 'YOUR_SECRET_KEY',
  testMode: true // Set to false for production
});

// Create a payment
const response = await client.createPayment({
  amount: 100.50,
  currency: 'RON',
  invoiceId: 'INV123',
  orderDescription: 'Test order',
  billingDetails: {
    firstName: 'John',
    lastName: 'Doe',
    address: '123 Street',
    city: 'City',
    state: 'State',
    zipCode: '12345',
    country: 'Romania',
    phone: '1234567890',
    email: 'john@example.com'
  }
});

// Redirect user to payment page
window.location.href = response.redirectUrl;
```

## Advanced Usage

### Web Service Operations

For advanced operations like refunds, status checks, etc., initialize the client with web service credentials:

```typescript
const client = new EuPlatescClient({
  merchantId: 'YOUR_MERCHANT_ID',
  secretKey: 'YOUR_SECRET_KEY',
  testMode: true
}, {
  userKey: 'YOUR_USER_KEY',
  uapiKey: 'YOUR_UAPI_KEY'
});
```

### Recurring Payments

```typescript
// Initial recurring payment
const response = await client.createPayment({
  amount: 100,
  currency: 'RON',
  invoiceId: 'INV123',
  orderDescription: 'Monthly subscription',
  recurent: {
    type: 'Base',
    frequency: 30, // monthly
    expiry: '20251231' // expires end of 2025
  }
});

// Cancel recurring payment
await client.cancelRecurring({
  epid: 'TRANSACTION_EPID',
  reason: 'Customer request'
});
```

### Transaction Management

```typescript
// Check transaction status
const status = await client.checkStatus({
  epid: 'TRANSACTION_EPID'
});

// Process refund
const refund = await client.refund({
  epid: 'TRANSACTION_EPID',
  amount: 50.00,
  reason: 'Customer dissatisfaction'
});

// Capture authorized payment
const capture = await client.capture({
  epid: 'TRANSACTION_EPID',
  amount: 100.00 // Optional for partial capture
});
```

### Reports and Information

```typescript
// Get merchant information
const info = await client.checkMerchantInfo();

// Get invoice list
const invoices = await client.getInvoices({
  from: '2024-01-01',
  to: '2024-01-31'
});

// Get captured totals
const totals = await client.getCapturedTotals({
  mids: ['MID1', 'MID2'],
  from: '2024-01-01',
  to: '2024-01-31'
});
```

## API Documentation

### Client Configuration

#### `EuPlatescConfig`
- `merchantId`: Your EuPlatesc merchant ID
- `secretKey`: Your EuPlatesc secret key
- `testMode`: Boolean to toggle test/production mode

#### `WebServiceConfig`
- `userKey`: Your web service user key
- `uapiKey`: Your web service API key

### Available Methods

- `createPayment`: Process a new payment
- `verifyResponse`: Verify payment callback response
- `checkStatus`: Check transaction status
- `cancelRecurring`: Cancel recurring payment series
- `refund`: Process refund
- `capture`: Capture authorized payment
- `checkMerchantInfo`: Get merchant account info
- `getCardArt`: Get card art data
- `getSavedCards`: Get saved cards for customer
- `getCapturedTotals`: Get transaction totals
- `getInvoices`: Get invoice list
- `getInvoiceTransactions`: Get transactions for invoice

For detailed method signatures and types, refer to the TypeScript definitions.

## Error Handling

All methods return a `WebServiceResponse` type with the following structure:

```typescript
interface WebServiceResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
}
```

Handle errors appropriately:

```typescript
const response = await client.refund({
  epid: 'TRANSACTION_EPID',
  amount: 50.00,
  reason: 'Refund reason'
});

if (!response.success) {
  console.error('Refund failed:', response.message);
  return;
}

console.log('Refund successful:', response.data);
```

## Testing

The package includes test cards for development:

| Card Number | Expiry | CVC | Result |
|------------|---------|-----|---------|
| 4111111111111111 | 27/01 | 123 | Approved |
| 4444333322221111 | 27/01 | 123 | Insufficient funds |
| 4000020000000000 | 27/01 | 123 | Declined |

More test cards available in the documentation.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contact

Paul George - contact@paulgeorge.dev

Project Link: [https://github.com/paulgeorge35/eu-platesc](https://github.com/paulgeorge35/eu-platesc)
