export class BillingActionError extends Error {
  readonly code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "BillingActionError"
    this.code = code
  }
}
