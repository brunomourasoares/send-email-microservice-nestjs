import { EmailAddress } from '../value-objects/email-address.vo';

export class Email {
  constructor(
    readonly to: EmailAddress,
    readonly subject: string,
    readonly body: string,
  ) {}
}
