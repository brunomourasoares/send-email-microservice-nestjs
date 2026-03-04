import { Controller } from '@nestjs/common';
import {
  EventPattern,
  Payload,
  Ctx,
  KafkaContext,
} from '@nestjs/microservices';

import type { SendEmailEvent } from '../events/send-email.event';
import { KafkaDlqProducer } from '../../infrastructure/kafka/kafka-dlq.producer';
import { KAFKA_TOPICS } from '../../shared/kafka/kafka-topics';
import { KafkaMessage } from 'kafkajs';

@Controller()
export class EmailRetryConsumer {
  constructor(private readonly producer: KafkaDlqProducer) {}

  @EventPattern(KAFKA_TOPICS.SEND_EMAIL_RETRY)
  async handle(
    @Payload()
    payload: SendEmailEvent,
    @Ctx()
    context: KafkaContext,
  ): Promise<void> {
    const message: KafkaMessage = context.getMessage();

    await this.producer.send(
      KAFKA_TOPICS.SEND_EMAIL,
      payload,
      message.headers as Record<string, string>,
    );

    await context.getConsumer().commitOffsets([
      {
        topic: context.getTopic(),
        partition: context.getPartition(),
        offset: (Number(message.offset) + 1).toString(),
      },
    ]);
  }
}
