import { Inject, Injectable } from '@nestjs/common';
import { EmailSenderPort } from '../../domain/ports/email-sender.port';
import type { MailConfig } from './mail-config.interface';
import { Email } from '../../domain/entities/email.entity';
import { EmailSendFailedError } from '../../domain/errors/email-send-failed.error';
import nodemailer, { SentMessageInfo, Transporter } from 'nodemailer';

@Injectable()
export class SmtpEmailAdapter implements EmailSenderPort {
  private readonly transporter: Transporter<SentMessageInfo>;

  constructor(
    @Inject('MAIL_CONFIG')
    private readonly config: MailConfig,
  ) {
    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port: this.config.port,
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
    });
  }

  async send(email: Email): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: email.to.value,
        subject: email.subject,
        html: email.body,
      });
    } catch (error) {
      throw new EmailSendFailedError(error);
    }
  }
}
