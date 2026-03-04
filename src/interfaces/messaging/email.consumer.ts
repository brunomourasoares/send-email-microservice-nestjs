import { Controller } from '@nestjs/common';
import { SendEmailUseCase } from '../../application/use-cases/send-email.use-case';
import type { SendEmailEvent } from '../events/send-email.event';
import {
  Ctx,
  EventPattern,
  KafkaContext,
  Payload,
} from '@nestjs/microservices';
import { IHeaders, KafkaMessage } from 'kafkajs';
import { KAFKA_TOPICS } from '../../shared/kafka/kafka-topics';
import { KafkaDlqProducer } from '../../infrastructure/kafka/kafka-dlq.producer';

@Controller()
export class EmailConsumer {
  private readonly MAX_RETRIES = 3;
  private readonly RETRY_DELAY_MS = 3000;

  constructor(
    private readonly sendEmailUseCase: SendEmailUseCase,
    private readonly dlqProducer: KafkaDlqProducer,
  ) {}

  @EventPattern(KAFKA_TOPICS.SEND_EMAIL)
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

    try {
      await this.sendEmailUseCase.execute(payload);
      await context.getConsumer().commitOffsets([
        {
          topic: context.getTopic(),
          partition: context.getPartition(),
          offset: (Number(message.offset) + 1).toString(),
        },
      ]);
    } catch (error: unknown) {
      if (retryCount < this.MAX_RETRIES) {
        await this.delay(this.RETRY_DELAY_MS);
        await this.dlqProducer.send(KAFKA_TOPICS.SEND_EMAIL_RETRY, payload, {
          'x-retry-count': String(retryCount + 1),
          'x-original-topic': KAFKA_TOPICS.SEND_EMAIL,
        });
      } else {
        await this.dlqProducer.send(KAFKA_TOPICS.SEND_EMAIL_DLQ, payload, {
          'x-error': (error as Error).message,
        });
      }

      await context.getConsumer().commitOffsets([
        {
          topic: context.getTopic(),
          partition: context.getPartition(),
          offset: (Number(message.offset) + 1).toString(),
        },
      ]);
    }
  }

  private async delay(ms: number): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, ms));
  }
}
