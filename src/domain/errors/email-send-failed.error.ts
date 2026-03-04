export class EmailSendFailedError extends Error {
  constructor(cause?: unknown) {
    super('Failed to send email');
    this.name = 'EmailSendFailedError';
    this.cause = cause;
  }
}
