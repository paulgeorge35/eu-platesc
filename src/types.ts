export interface EuPlatescConfig {
  merchantId: string;
  secretKey: string;
  testMode?: boolean;
}

export interface PaymentRequest {
  amount: number;
  currency: string;
  invoiceId: string;
  orderDescription: string;
  billingDetails?: BillingDetails;
  shippingDetails?: ShippingDetails;
  extraData?: ExtraData;
  recurent?: RecurringConfig;
  generateEpid?: boolean;
  valability?: string; // YYYYMMDDHHmmSS format
  c2pId?: string;
  c2pCid?: string;
  lang?: 'ro' | 'en' | 'fr' | 'de' | 'it' | 'es' | 'hu';
}

export interface BillingDetails {
  firstName: string;
  lastName: string;
  company?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email: string;
}

export interface ShippingDetails {
  firstName: string;
  lastName: string;
  company?: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
  email: string;
}

export interface ExtraData {
  silentUrl?: string;
  silentUrlSec?: string;
  successUrl?: string;
  failedUrl?: string;
  epTarget?: 'self';
  epMethod?: 'post' | 'get' | 'getclean';
  backToSite?: string;
  backToSiteMethod?: 'post' | 'get';
  expireUrl?: string;
  rate?: string;
  filtruRate?: string;
  epChannel?: string[];
}

export interface PaymentResponse {
  redirectUrl: string;
  epId?: string;
}

export interface TransactionStatus {
  epId: string;
  invoiceId: string;
  amount: string;
  currency: string;
  status: '0' | string;
  message: string;
  approval?: string;
  timestamp: string;
  nonce: string;
  fpHash: string;
}

export interface RecurringConfig {
  type: 'Base' | 'Recurent' | 'Recurent2CIT';
  frequency?: number; // in days, max 255
  expiry?: string; // format: YYYYMMDD
  baseEPID?: string; // required for subsequent recurring payments
}

export interface WebServiceConfig {
  userKey: string;
  uapiKey: string;
}

export interface CheckStatusRequest {
  epid?: string;
  invoiceId?: string;
}

export interface RecurringCancellationRequest {
  epid: string;
  reason?: string;
}

export interface RefundRequest {
  epid: string;
  amount: number;
  reason: string;
}

export interface CaptureRequest {
  epid: string;
  amount?: number; // Optional for full capture, required for partial
}

export interface WebServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
}

export interface CardArtResponse {
  bin: string;
  last4: string;
  exp: string;
  cardart: string; // BASE64 encoded image
}

export interface SavedCard {
  id: string;
  bin: string;
  last4: string;
  mask: string;
  exp: string;
  cardart: string;
}

export interface SavedCardsResponse {
  cards: SavedCard[];
}

export interface CurrencyTotals {
  [currency: string]: string; // e.g., { EUR: "xxx", GBP: "xxx", ... }
}

export interface MerchantInfo {
  name: string;
  url: string;
  cui: string;
  j: string;
  status: 'test' | 'live';
  recuring: 'N' | 'Y' | 'YA';
  tpl: 'tpl-v15' | 'tpl-v17' | 'tpl-v21';
  rate_mode: 'C' | 'EP';
  rate_apb?: string;
  rate_btrl?: string;
  rate_brdf?: string;
  rate_fbr?: string;
  rate_gbr?: string;
  rate_rzb?: string;
}

export interface InvoiceTransaction {
  mid: string;
  invoice_id: string;
  epid: string;
  rrn: string;
  amount: string;
  currency: string;
  commission: string;
  installments: string;
  type: 'capture' | 'chargeback';
}

export interface Invoice {
  invoice_number: string;
  invoice_date: string;
  invoice_amount_novat: string;
  invoice_amount_vat: string;
  invoice_currency: string;
  transactions_number: string;
  transactions_amount: string;
  transferred_amount: string;
}

export type WebServiceSuccessResponse =
  | { success: '1' }  // For simple success responses
  | { success: string }  // For responses with baseEPID
  | { success: TransactionStatus[] }  // For transaction status
  | { success: Invoice[] }  // For invoice list
  | { success: InvoiceTransaction[] }  // For invoice transactions
  | { success: CurrencyTotals }  // For captured totals
  | SavedCardsResponse  // For saved cards list
  | CardArtResponse  // For card art data
  | MerchantInfo;  // For check MID response

export interface WebServiceErrorResponse {
  error: string;
}