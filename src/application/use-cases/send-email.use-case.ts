import { Inject, Injectable, Logger } from '@nestjs/common';
import { EMAIL_SENDER } from '../../domain/ports/email-sender.port';
import type { EmailSenderPort } from '../../domain/ports/email-sender.port';
import { SendEmailCommand } from '../commands/send-email.command';
import { Email } from '../../domain/entities/email.entity';
import { EmailAddress } from '../../domain/value-objects/email-address.vo';

@Injectable()
export class SendEmailUseCase {
  private readonly logger: Logger = new Logger(SendEmailUseCase.name);

  constructor(
    @Inject(EMAIL_SENDER)
    private readonly emailSender: EmailSenderPort,
  ) {}

  async execute(command: SendEmailCommand): Promise<void> {
    if (!command.to?.trim()) {
      throw new Error('Field "to" is required');
    }

    if (!command.subject?.trim()) {
      throw new Error('Field "subject" is required');
    }

    if (!command.body?.trim()) {
      throw new Error('Field "body" is required');
    }

    this.logger.log(`Executing send email to "${command.to}"`);

    const email: Email = new Email(
      new EmailAddress(command.to),
      command.subject,
      command.body,
      command.bodyText,
    );

    await this.emailSender.send(email);
    this.logger.log(`Email dispatched to "${command.to}"`);
  }
}
