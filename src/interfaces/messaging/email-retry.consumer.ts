import { Controller, Logger } from '@nestjs/common';
import {
  EventPattern,
  Payload,
  Ctx,
  KafkaContext,
} from '@nestjs/microservices';

import type { SendEmailEvent } from '../events/send-email.event';
import { KafkaDlqProducer } from '../../infrastructure/kafka/kafka-dlq.producer';
import { SendEmailUseCase } from '../../application/use-cases/send-email.use-case';
import { KAFKA_TOPICS } from '../../shared/kafka/kafka-topics';
import { IHeaders, KafkaMessage } from 'kafkajs';

@Controller()
export class EmailRetryConsumer {
  private readonly logger: Logger = new Logger(EmailRetryConsumer.name);

  constructor(
    private readonly sendEmailUseCase: SendEmailUseCase,
    private readonly dlqProducer: KafkaDlqProducer,
  ) {}

  @EventPattern(KAFKA_TOPICS.SEND_EMAIL_RETRY)
  async handle(
    @Payload()
    payload: SendEmailEvent,
    @Ctx()
    context: KafkaContext,
  ): Promise<void> {
    const message: KafkaMessage = context.getMessage();
    const headers: IHeaders = message.headers ?? {};
    const retryCount: number = Number(
      headers['x-retry-count']?.toString() ?? 0,
    );

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
      await context.getConsumer().commitOffsets([
        {
          topic: context.getTopic(),
          partition: context.getPartition(),
          offset: (Number(message.offset) + 1).toString(),
        },
      ]);
    }
  }
}
