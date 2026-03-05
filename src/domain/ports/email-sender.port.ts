import { Email } from '../entities/email.entity';

export const EMAIL_SENDER: symbol = Symbol('EMAIL_SENDER');

export interface EmailSenderPort {
  send(email: Email): Promise<void>;
}
