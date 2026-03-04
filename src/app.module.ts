import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EmailRetryConsumer } from './interfaces/messaging/email-retry.consumer';
import { EmailConsumer } from './interfaces/messaging/email.consumer';
import { SendEmailUseCase } from './application/use-cases/send-email.use-case';
import { KafkaDlqProducer } from './infrastructure/kafka/kafka-dlq.producer';
import { MailConfig } from './infrastructure/mail/mail-config.interface';
import { SmtpEmailAdapter } from './infrastructure/mail/smtp-email.adapter';
import { EMAIL_SENDER } from './domain/ports/email-sender.token';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
  ],
  controllers: [EmailConsumer, EmailRetryConsumer],
  providers: [
    KafkaDlqProducer,
    {
      provide: 'MAIL_CONFIG',
      useFactory: (configService: ConfigService): MailConfig => ({
        host: configService.getOrThrow<string>('MAIL_HOST'),
        port: configService.getOrThrow<number>('MAIL_PORT'),
        user: configService.getOrThrow<string>('MAIL_USER'),
        pass: configService.getOrThrow<string>('MAIL_PASS'),
        from: configService.getOrThrow<string>('MAIL_FROM'),
      }),
      inject: [ConfigService],
    },
    {
      provide: EMAIL_SENDER,
      useClass: SmtpEmailAdapter,
    },
    SendEmailUseCase,
  ],
})
export class AppModule {}
