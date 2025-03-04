import { createHmac, randomBytes } from 'node:crypto';
import { EuPlatescError } from './errors';
import type { CaptureRequest, CardArtResponse, CheckStatusRequest, CurrencyTotals, EuPlatescConfig, Invoice, InvoiceTransaction, MerchantInfo, PaymentRequest, PaymentResponse, RecurringCancellationRequest, RefundRequest, SavedCardsResponse, TransactionStatus, WebServiceConfig, WebServiceErrorResponse, WebServiceResponse, WebServiceSuccessResponse } from './types';

/**
 * EuPlatesc payment gateway client
 * Provides methods for processing payments and managing transactions
 */
export class EuPlatescClient {
  private readonly config: EuPlatescConfig;
  private readonly endpoint: string;
  private readonly wsEndpoint = 'https://manager.euplatesc.ro/v3/index.php?action=ws';
  private readonly wsConfig?: WebServiceConfig;

  /**
   * Creates a new instance of the EuPlatesc client
   * @param config - Basic configuration including merchant ID and secret key
   * @param wsConfig - Optional web service configuration for additional operations
   * @example
   * ```typescript
   * const client = new EuPlatescClient({
   *   merchantId: 'YOUR_MERCHANT_ID',
   *   secretKey: 'YOUR_SECRET_KEY',
   *   testMode: true
   * }, {
   *   userKey: 'YOUR_USER_KEY',
   *   uapiKey: 'YOUR_UAPI_KEY'
   * });
   * ```
   */
  constructor(
    config: EuPlatescConfig,
    wsConfig?: WebServiceConfig
  ) {
    this.config = config;
    this.endpoint = config.testMode
      ? 'https://secure.euplatesc.ro/tdsprocess/tranzactd.php'
      : 'https://secure.euplatesc.ro/tdsprocess/tranzactd.php';
    this.wsConfig = wsConfig;
  }

  /**
   * Initiates a payment request and returns the redirect URL for the payment page
   * @param request - Payment request details including amount, currency, and optional billing/shipping info
   * @returns Promise resolving to payment response containing the redirect URL
   * @throws {EuPlatescError} If there's an error generating the payment request
   */
  async createPayment(request: PaymentRequest): Promise<PaymentResponse> {
    const timestamp = this.generateTimestamp();
    const nonce = this.generateNonce();

    const data = {
      amount: request.amount.toFixed(2),
      curr: request.currency,
      invoice_id: request.invoiceId,
      order_desc: request.orderDescription,
      merch_id: this.config.merchantId,
      timestamp,
      nonce,
      ...(request.generateEpid ? { generate_epid: '1' } : {}),
      ...(request.valability ? { valability: request.valability } : {}),
      ...(request.c2pId ? { c2p_id: request.c2pId } : {}),
      ...(request.c2pCid ? { c2p_cid: request.c2pCid } : {}),
      ...(request.lang ? { lang: request.lang } : {})
    };

    const fpHash = this.generateHash(data);

    const queryParams = new URLSearchParams();

    // Add base data
    for (const [key, value] of Object.entries({
      ...data,
      fp_hash: fpHash,
      ...this.formatBillingDetails(request.billingDetails),
      ...this.formatShippingDetails(request.shippingDetails),
      ...this.formatExtraData(request.extraData),
    })) {
      if (value !== undefined) {
        queryParams.append(key, value);
      }
    }

    return {
      redirectUrl: `${this.endpoint}?${queryParams.toString()}`
    };
  }

  /**
   * Verifies the authenticity of a transaction response
   */
  verifyResponse(responseData: Record<string, string>): TransactionStatus {
    const {
      amount,
      curr,
      invoice_id,
      ep_id,
      merch_id,
      action,
      message,
      approval,
      timestamp,
      nonce,
      fp_hash
    } = responseData;

    const calculatedHash = this.generateHash({
      amount,
      curr,
      invoice_id,
      ep_id,
      merch_id,
      action,
      message,
      approval,
      timestamp,
      nonce
    });

    if (calculatedHash !== fp_hash) {
      throw new EuPlatescError('Invalid response signature');
    }

    return {
      epId: ep_id,
      invoiceId: invoice_id,
      amount,
      currency: curr,
      status: action,
      message,
      approval,
      timestamp,
      nonce,
      fpHash: fp_hash
    };
  }

  private generateTimestamp(): string {
    return new Date().toISOString()
      .replace(/[-T:]/g, '')
      .slice(0, 14);
  }

  private generateNonce(): string {
    return randomBytes(32).toString('hex');
  }

  private generateHash(data: Record<string, string>): string {
    let hmacInput = '';

    for (const value of Object.values(data)) {
      hmacInput += value.length > 0
        ? value.length + value
        : '-';
    }

    const hmac = createHmac('md5', Buffer.from(this.config.secretKey, 'hex'));
    return hmac.update(hmacInput, 'utf8').digest('hex').toUpperCase();
  }

  private formatBillingDetails(details?: PaymentRequest['billingDetails']) {
    if (!details) return {};

    return {
      name: details.firstName,
      lname: details.lastName,
      company: details.company,
      add: details.address,
      city: details.city,
      state: details.state,
      zip: details.zipCode,
      country: details.country,
      phone: details.phone,
      email: details.email
    };
  }

  private formatShippingDetails(details?: PaymentRequest['shippingDetails']) {
    if (!details) return {};

    return {
      sfname: details.firstName,
      slname: details.lastName,
      scompany: details.company,
      sadd: details.address,
      scity: details.city,
      sstate: details.state,
      szip: details.zipCode,
      scountry: details.country,
      sphone: details.phone,
      semail: details.email
    };
  }

  private formatExtraData(data?: PaymentRequest['extraData']) {
    if (!data) return {};

    const formattedData: Record<string, string> = {};

    if (data.silentUrl) formattedData['ExtraData[silenturl]'] = data.silentUrl;
    if (data.silentUrlSec) formattedData['ExtraData[silenturlsec]'] = data.silentUrlSec;
    if (data.successUrl) formattedData['ExtraData[successurl]'] = data.successUrl;
    if (data.failedUrl) formattedData['ExtraData[failedurl]'] = data.failedUrl;
    if (data.epTarget) formattedData['ExtraData[ep_target]'] = data.epTarget;
    if (data.epMethod) formattedData['ExtraData[ep_method]'] = data.epMethod;
    if (data.backToSite) formattedData['ExtraData[backtosite]'] = data.backToSite;
    if (data.backToSiteMethod) formattedData['ExtraData[backtosite_method]'] = data.backToSiteMethod;
    if (data.expireUrl) formattedData['ExtraData[expireurl]'] = data.expireUrl;
    if (data.rate) formattedData['ExtraData[rate]'] = data.rate;
    if (data.filtruRate) formattedData['ExtraData[filtru_rate]'] = data.filtruRate;
    if (data.epChannel) formattedData['ExtraData[ep_channel]'] = data.epChannel.join(',');

    return formattedData;
  }

  /**
   * Checks the status of one or more transactions
   * @param request - Status check request containing either EPID or invoice ID
   * @returns Promise resolving to transaction status(es)
   * @requires WebServiceConfig
   */
  async checkStatus(request: CheckStatusRequest): Promise<WebServiceResponse<TransactionStatus[]>> {
    if (!this.wsConfig) {
      return {
        success: false,
        message: 'WebService configuration required for this operation'
      };
    }

    const timestamp = this.generateTimestamp();
    const nonce = this.generateNonce();

    const data = {
      method: 'check_status',
      mid: this.config.merchantId,
      timestamp,
      nonce,
      ...(request.epid ? { epid: request.epid } : {}),
      ...(request.invoiceId ? { invoice_id: request.invoiceId } : {})
    };

    const fpHash = this.generateHash(data);
    return this.makeWebServiceRequest<TransactionStatus[]>({
      ...data,
      fp_hash: fpHash
    });
  }

  /**
   * Cancels a recurring payment series
   * @param request - Cancellation request containing the base EPID and optional reason
   * @returns Promise resolving to the base EPID of the cancelled series
   * @requires WebServiceConfig
   */
  async cancelRecurring(request: RecurringCancellationRequest): Promise<WebServiceResponse<string>> {
    if (!this.wsConfig) {
      return {
        success: false,
        message: 'WebService configuration required for this operation'
      };
    }

    const timestamp = this.generateTimestamp();
    const nonce = this.generateNonce();

    const data = {
      method: 'cancel_recurring',
      ukey: this.wsConfig.userKey,
      epid: request.epid,
      reason: request.reason || '',
      timestamp,
      nonce
    };

    const fpHash = this.generateUapiHash(data);
    return this.makeWebServiceRequest<string>({
      ...data,
      fp_hash: fpHash
    });
  }

  /**
   * Processes a refund for a transaction
   * @param request - Refund request containing EPID, amount, and reason
   * @returns Promise resolving to boolean indicating success
   * @requires WebServiceConfig
   */
  async refund(request: RefundRequest): Promise<WebServiceResponse<boolean>> {
    if (!this.wsConfig) {
      return {
        success: false,
        message: 'WebService configuration required for this operation'
      };
    }

    const timestamp = this.generateTimestamp();
    const nonce = this.generateNonce();

    const data = {
      method: 'refund',
      ukey: this.wsConfig.userKey,
      epid: request.epid,
      amount: request.amount.toFixed(2),
      reason: request.reason,
      timestamp,
      nonce
    };

    const fpHash = this.generateUapiHash(data);
    const response = await this.makeWebServiceRequest<{ success: string }>({
      ...data,
      fp_hash: fpHash
    });

    return {
      ...response,
      data: response.success && response.data?.success === '1'
    };
  }

  /**
   * Captures a previously authorized payment
   * @param request - Capture request containing EPID and optional amount for partial capture
   * @returns Promise resolving to boolean indicating success
   * @requires WebServiceConfig
   */
  async capture(request: CaptureRequest): Promise<WebServiceResponse<boolean>> {
    if (!this.wsConfig) {
      return {
        success: false,
        message: 'WebService configuration required for this operation'
      };
    }

    const timestamp = this.generateTimestamp();
    const nonce = this.generateNonce();

    const data = {
      method: request.amount ? 'partial_capture' : 'capture',
      ukey: this.wsConfig.userKey,
      epid: request.epid,
      ...(request.amount ? { amount: request.amount.toFixed(2) } : {}),
      timestamp,
      nonce
    };

    const fpHash = this.generateUapiHash(data);
    const response = await this.makeWebServiceRequest<{ success: string }>({
      ...data,
      fp_hash: fpHash
    });

    return {
      ...response,
      data: response.success && response.data?.success === '1'
    };
  }

  private generateUapiHash(data: Record<string, string>): string {
    if (!this.wsConfig) {
      throw new EuPlatescError('WebService configuration required for this operation');
    }

    let hmacInput = '';
    for (const value of Object.values(data)) {
      hmacInput += value.length > 0 ? value.length + value : '-';
    }

    const hmac = createHmac('md5', Buffer.from(this.wsConfig.uapiKey, 'hex'));
    return hmac.update(hmacInput, 'utf8').digest('hex').toUpperCase();
  }

  private async makeWebServiceRequest<T>(data: Record<string, string>): Promise<WebServiceResponse<T>> {
    try {
      const response = await fetch(this.wsEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams(data).toString()
      });

      if (!response.ok) {
        return {
          success: false,
          message: `HTTP error! status: ${response.status}`
        };
      }

      const result = await response.json() as WebServiceSuccessResponse | WebServiceErrorResponse;

      if ('error' in result) {
        return {
          success: false,
          message: result.error
        };
      }

      // Handle different response types
      if ('cards' in result) {
        return { success: true, data: result as T };
      }

      if (!('success' in result)) {
        return { success: true, data: result as T };
      }

      return {
        success: true,
        data: result.success as T
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Retrieves merchant account information and settings
   * @returns Promise resolving to merchant information
   * @requires WebServiceConfig
   */
  async checkMerchantInfo(): Promise<WebServiceResponse<MerchantInfo>> {
    if (!this.wsConfig) {
      return {
        success: false,
        message: 'WebService configuration required for this operation'
      };
    }

    const timestamp = this.generateTimestamp();
    const nonce = this.generateNonce();

    const data = {
      method: 'check_mid',
      mid: this.config.merchantId,
      timestamp,
      nonce
    };

    const fpHash = this.generateHash(data);
    return this.makeWebServiceRequest<MerchantInfo>({
      ...data,
      fp_hash: fpHash
    });
  }

  /**
   * Retrieves card art data for a specific transaction
   * @param epid - The EPID of the transaction
   * @returns Promise resolving to card art data including BIN, last 4 digits, and image
   * @requires WebServiceConfig
   */
  async getCardArt(epid: string): Promise<WebServiceResponse<CardArtResponse>> {
    if (!this.wsConfig) {
      return {
        success: false,
        message: 'WebService configuration required for this operation'
      };
    }

    const timestamp = this.generateTimestamp();
    const nonce = this.generateNonce();

    const data = {
      method: 'cardart',
      ukey: this.wsConfig.userKey,
      ep_id: epid,
      timestamp,
      nonce
    };

    const fpHash = this.generateUapiHash(data);
    return this.makeWebServiceRequest<CardArtResponse>({
      ...data,
      fp_hash: fpHash
    });
  }

  /**
   * Retrieves saved cards for a specific customer
   * @param c2pId - The unique customer ID in the Click2Pay system
   * @returns Promise resolving to list of saved cards
   * @requires WebServiceConfig
   */
  async getSavedCards(c2pId: string): Promise<WebServiceResponse<SavedCardsResponse>> {
    if (!this.wsConfig) {
      return {
        success: false,
        message: 'WebService configuration required for this operation'
      };
    }

    const timestamp = this.generateTimestamp();
    const nonce = this.generateNonce();

    const data = {
      method: 'c2p_cards',
      mid: this.config.merchantId,
      c2p_id: c2pId,
      timestamp,
      nonce
    };

    const fpHash = this.generateHash(data);
    return this.makeWebServiceRequest<SavedCardsResponse>({
      ...data,
      fp_hash: fpHash
    });
  }

  /**
   * Retrieves captured transaction totals grouped by currency
   * @param options - Request options including merchant IDs and date range
   * @returns Promise resolving to totals per currency
   * @requires WebServiceConfig
   */
  async getCapturedTotals(options: {
    mids: string[];
    from?: string;
    to?: string;
  }): Promise<WebServiceResponse<CurrencyTotals>> {
    if (!this.wsConfig) {
      return {
        success: false,
        message: 'WebService configuration required for this operation'
      };
    }

    const timestamp = this.generateTimestamp();
    const nonce = this.generateNonce();

    const data = {
      method: 'captured_total',
      ukey: this.wsConfig.userKey,
      mids: options.mids.join(','),
      from: options.from || '',
      to: options.to || '',
      timestamp,
      nonce
    };

    const fpHash = this.generateUapiHash(data);
    return this.makeWebServiceRequest<CurrencyTotals>({
      ...data,
      fp_hash: fpHash
    });
  }

  /**
   * Retrieves list of invoices for the merchant
   * @param options - Request options including date range
   * @returns Promise resolving to list of invoices
   * @requires WebServiceConfig
   */
  async getInvoices(options: {
    from?: string;
    to?: string;
  }): Promise<WebServiceResponse<Invoice[]>> {
    if (!this.wsConfig) {
      return {
        success: false,
        message: 'WebService configuration required for this operation'
      };
    }

    const timestamp = this.generateTimestamp();
    const nonce = this.generateNonce();

    const data = {
      method: 'invoices',
      ukey: this.wsConfig.userKey,
      mid: this.config.merchantId,
      from: options.from || '',
      to: options.to || '',
      timestamp,
      nonce
    };

    const fpHash = this.generateUapiHash(data);
    return this.makeWebServiceRequest<Invoice[]>({
      ...data,
      fp_hash: fpHash
    });
  }

  /**
   * Retrieves transactions for a specific invoice
   * @param invoiceNumber - The invoice number in format FPSxxxxxxxx
   * @returns Promise resolving to list of transactions
   * @requires WebServiceConfig
   */
  async getInvoiceTransactions(
    invoiceNumber: string
  ): Promise<WebServiceResponse<InvoiceTransaction[]>> {
    if (!this.wsConfig) {
      return {
        success: false,
        message: 'WebService configuration required for this operation'
      };
    }

    const timestamp = this.generateTimestamp();
    const nonce = this.generateNonce();

    const data = {
      method: 'invoice',
      ukey: this.wsConfig.userKey,
      invoice: invoiceNumber,
      timestamp,
      nonce
    };

    const fpHash = this.generateUapiHash(data);
    return this.makeWebServiceRequest<InvoiceTransaction[]>({
      ...data,
      fp_hash: fpHash
    });
  }
}