declare module '@paystack/inline-js' {
  export interface PaystackResumeCallbacks {
    onSuccess?: (transaction: { id?: number; reference?: string; message?: string }) => void
    onCancel?: () => void
    onError?: (error: { message?: string }) => void
    onLoad?: (response: { id?: number; accessCode?: string }) => void
  }

  export default class Paystack {
    resumeTransaction(accessCode: string, callbacks?: PaystackResumeCallbacks): void
  }
}
