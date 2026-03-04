import { Email } from '../entities/email.entity';

export interface EmailSenderPort {
  send(email: Email): Promise<void>;
}
