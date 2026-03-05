import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaDlqProducer implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(KafkaDlqProducer.name);
  private readonly producer: Producer;

  constructor() {
    const brokers: string | undefined = process.env.KAFKA_BROKERS;
    if (!brokers) {
      throw new Error('KAFKA_BROKERS environment variable is required');
    }

    const kafka: Kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID ?? 'email-service-dlq',
      brokers: brokers.split(',').map((b) => b.trim()),
    });

    this.producer = kafka.producer();
  }

  async onModuleInit(): Promise<void> {
    await this.producer.connect();
    this.logger.log('Kafka DLQ producer connected');
  }

  async onModuleDestroy(): Promise<void> {
    await this.producer.disconnect();
    this.logger.log('Kafka DLQ producer disconnected');
  }

  async send(
    topic: string,
    payload: unknown,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this.producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(payload),
          headers,
        },
      ],
    });
    this.logger.log(`Message sent to topic "${topic}"`);
  }
}
