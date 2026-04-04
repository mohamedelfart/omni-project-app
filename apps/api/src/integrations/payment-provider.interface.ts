export interface PaymentProvider {
  createIntent(input: {
    amountMinor: number;
    currency: string;
    reference: string;
    countryCode: string;
  }): Promise<{ providerRef: string; clientSecret: string }>;
}
