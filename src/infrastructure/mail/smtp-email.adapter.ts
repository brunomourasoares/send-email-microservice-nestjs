import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { EmailSenderPort } from '../../domain/ports/email-sender.port';
import type { MailConfig } from './mail-config.interface';
import { Email } from '../../domain/entities/email.entity';
import { EmailSendFailedError } from '../../domain/errors/email-send-failed.error';
import nodemailer, { SentMessageInfo, Transporter } from 'nodemailer';

@Injectable()
export class SmtpEmailAdapter implements EmailSenderPort, OnModuleInit {
  private readonly logger: Logger = new Logger(SmtpEmailAdapter.name);
  private readonly transporter: Transporter<SentMessageInfo>;

  constructor(
    @Inject('MAIL_CONFIG')
    private readonly config: MailConfig,
  ) {
    const port: number = parseInt(String(this.config.port), 10);
    const secure: boolean = port === 465;

    this.transporter = nodemailer.createTransport({
      host: this.config.host,
      port,
      secure,
      auth: {
        user: this.config.user,
        pass: this.config.pass,
      },
      tls: {
        rejectUnauthorized: true,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log(
        `SMTP connection verified — ${this.config.host}:${this.config.port}`,
      );
    } catch (error: unknown) {
      this.logger.error(
        `SMTP connection failed — ${this.config.host}:${this.config.port}`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  async send(email: Email): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.config.from,
        to: email.to.value,
        subject: email.subject,
        html: email.body,
        text: email.bodyText ?? email.body.replace(/<[^>]*>/g, ''),
      });
      this.logger.log(`Email sent to "${email.to.value}"`);
    } catch (error: unknown) {
      this.logger.error(
        `Failed to send email to "${email.to.value}"`,
        error instanceof Error ? error.stack : String(error),
      );
      throw new EmailSendFailedError(error);
    }
  }
}
