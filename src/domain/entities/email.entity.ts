import { EmailAddress } from '../value-objects/email-address.vo';

export class Email {
  readonly to: EmailAddress;
  readonly subject: string;
  readonly body: string;
  readonly bodyText?: string;

  constructor(
    to: EmailAddress,
    subject: string,
    body: string,
    bodyText?: string,
  ) {
    if (!subject.trim()) {
      throw new Error('Email subject must not be empty');
    }

    if (!body.trim()) {
      throw new Error('Email body must not be empty');
    }

    this.to = to;
    this.subject = subject.trim();
    this.body = body;
    this.bodyText = bodyText?.trim() || undefined;
  }
}
