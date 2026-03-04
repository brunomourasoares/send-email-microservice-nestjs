import { Inject } from '@nestjs/common';
import { EMAIL_SENDER } from '../../domain/ports/email-sender.token';
import type { EmailSenderPort } from '../../domain/ports/email-sender.port';
import { SendEmailCommand } from '../commands/send-email.command';
import { Email } from '../../domain/entities/email.entity';
import { EmailAddress } from '../../domain/value-objects/email-address.vo';

export class SendEmailUseCase {
  constructor(
    @Inject(EMAIL_SENDER)
    private readonly emailSender: EmailSenderPort,
  ) {}

  async execute(command: SendEmailCommand): Promise<void> {
    const email = new Email(
      new EmailAddress(command.to),
      command.subject,
      command.body,
    );

    await this.emailSender.send(email);
  }
}
