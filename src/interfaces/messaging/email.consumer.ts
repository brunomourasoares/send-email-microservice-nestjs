import { Controller, Logger } from '@nestjs/common';
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
  private readonly MAX_RETRIES: number = 3;
  private readonly logger: Logger = new Logger(EmailConsumer.name);

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

    this.logger.log(
      `Processing email to "${payload.to}" (attempt ${retryCount + 1}/${this.MAX_RETRIES + 1})`,
    );

    try {
      await this.sendEmailUseCase.execute(payload);
      this.logger.log(`Email successfully sent to "${payload.to}"`);
    } catch (error: unknown) {
      if (retryCount < this.MAX_RETRIES) {
        this.logger.warn(
          `Failed to send email to "${payload.to}". Scheduling retry ${retryCount + 1}/${this.MAX_RETRIES}.`,
        );
        await this.dlqProducer.send(KAFKA_TOPICS.SEND_EMAIL_RETRY, payload, {
          'x-retry-count': String(retryCount + 1),
          'x-original-topic': KAFKA_TOPICS.SEND_EMAIL,
        });
      } else {
        this.logger.error(
          `Max retries reached for email to "${payload.to}". Sending to DLQ. Error: ${error instanceof Error ? error.message : String(error)}`,
        );
        await this.dlqProducer.send(KAFKA_TOPICS.SEND_EMAIL_DLQ, payload, {
          'x-error': error instanceof Error ? error.message : String(error),
        });
      }
    } finally {
      await this.commitOffset(context, message);
    }
  }

  private async commitOffset(
    context: KafkaContext,
    message: KafkaMessage,
  ): Promise<void> {
    await context.getConsumer().commitOffsets([
      {
        topic: context.getTopic(),
        partition: context.getPartition(),
        offset: (Number(message.offset) + 1).toString(),
      },
    ]);
  }
}
