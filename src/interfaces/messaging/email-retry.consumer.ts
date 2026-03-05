import { Controller, Logger } from '@nestjs/common';
import {
  EventPattern,
  Payload,
  Ctx,
  KafkaContext,
} from '@nestjs/microservices';
import type { SendEmailEvent } from '../../shared/messaging/send-email.event';
import { KafkaDlqProducer } from '../../infrastructure/kafka/kafka-dlq.producer';
import { SendEmailUseCase } from '../../application/use-cases/send-email.use-case';
import { KAFKA_TOPICS } from '../../shared/kafka/kafka-topics';
import { IHeaders, KafkaMessage } from 'kafkajs';
import {
  commitOffset,
  isValidSendEmailPayload,
} from '../../shared/kafka/kafka-consumer.utils';

@Controller()
export class EmailRetryConsumer {
  private readonly logger: Logger = new Logger(EmailRetryConsumer.name);

  constructor(
    private readonly sendEmailUseCase: SendEmailUseCase,
    private readonly dlqProducer: KafkaDlqProducer,
  ) {}

  @EventPattern(KAFKA_TOPICS.SEND_EMAIL_RETRY)
  async handle(
    @Payload() payload: SendEmailEvent,
    @Ctx() context: KafkaContext,
  ): Promise<void> {
    const message: KafkaMessage = context.getMessage();
    const headers: IHeaders = message.headers ?? {};
    const retryCount: number = Number(
      headers['x-retry-count']?.toString() ?? 0,
    );

    if (!isValidSendEmailPayload(payload)) {
      this.logger.error(
        `Invalid payload received on topic "${KAFKA_TOPICS.SEND_EMAIL_RETRY}". Sending to DLQ without retry.`,
      );
      await this.dlqProducer.send(KAFKA_TOPICS.SEND_EMAIL_DLQ, payload, {
        'x-error': 'Invalid payload: missing or empty required fields',
        'x-retry-count': String(retryCount),
      });
      await commitOffset(context, message);
      return;
    }

    this.logger.log(
      `Retrying email to "${payload.to}" (retry attempt ${retryCount})`,
    );

    try {
      await this.sendEmailUseCase.execute(payload);
      this.logger.log(`Retry succeeded for email to "${payload.to}"`);
    } catch (error: unknown) {
      this.logger.error(
        `Retry failed for email to "${payload.to}". Sending to DLQ. Error: ${error instanceof Error ? error.message : String(error)}`,
      );
      await this.dlqProducer.send(KAFKA_TOPICS.SEND_EMAIL_DLQ, payload, {
        'x-error': error instanceof Error ? error.message : String(error),
        'x-retry-count': String(retryCount),
      });
    } finally {
      await commitOffset(context, message);
    }
  }
}
