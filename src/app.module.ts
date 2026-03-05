import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EmailRetryConsumer } from './interfaces/messaging/email-retry.consumer';
import { EmailConsumer } from './interfaces/messaging/email.consumer';
import { SendEmailUseCase } from './application/use-cases/send-email.use-case';
import { KafkaDlqProducer } from './infrastructure/kafka/kafka-dlq.producer';
import { MailConfig } from './infrastructure/mail/mail.config';
import { SmtpEmailAdapter } from './infrastructure/mail/smtp-email.adapter';
import { EMAIL_SENDER } from './domain/ports/email-sender.port';
import { MAIL_CONFIG } from './infrastructure/mail/mail.config.token';
import { envValidationSchema } from './infrastructure/config/env.validation';
import { AppConfigService } from './shared/config/app-config.service';
import { profile } from './shared/config/profile';
import { KafkaOptions, Transport } from '@nestjs/microservices';

export function buildKafkaMicroserviceOptions(
  config: AppConfigService,
): KafkaOptions {
  return {
    transport: Transport.KAFKA,
    options: {
      client: {
        clientId: config.kafkaClientId,
        brokers: config.kafkaBrokers,
      },
      consumer: {
        groupId: config.kafkaConsumerGroup,
      },
    },
  };
}

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: `.env.${profile}`,
      validationSchema: envValidationSchema,
      validationOptions: {
        abortEarly: false,
      },
    }),
  ],
  controllers: [EmailConsumer, EmailRetryConsumer],
  providers: [
    AppConfigService,
    KafkaDlqProducer,
    {
      provide: MAIL_CONFIG,
      useFactory: (config: AppConfigService): MailConfig => ({
        host: config.mailHost,
        port: config.mailPort,
        user: config.mailUser,
        pass: config.mailPass,
        from: config.mailFrom,
        ignoreTls: config.mailIgnoreTls,
      }),
      inject: [AppConfigService],
    },
    {
      provide: EMAIL_SENDER,
      useClass: SmtpEmailAdapter,
    },
    SendEmailUseCase,
  ],
})
export class AppModule {}
