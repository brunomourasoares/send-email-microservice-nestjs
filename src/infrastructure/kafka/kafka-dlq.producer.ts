import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';
import { AppConfigService } from '../../shared/config/app-config.service';
import { KafkaTopic } from '../../shared/kafka/kafka-topics';

@Injectable()
export class KafkaDlqProducer implements OnModuleInit, OnModuleDestroy {
  private readonly logger: Logger = new Logger(KafkaDlqProducer.name);
  private readonly producer: Producer;

  constructor(private readonly config: AppConfigService) {
    const kafka: Kafka = new Kafka({
      clientId: this.config.kafkaClientId,
      brokers: this.config.kafkaBrokers,
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
    topic: KafkaTopic,
    payload: unknown,
    headers?: Record<string, string>,
  ): Promise<void> {
    if (payload === null || payload === undefined) {
      throw new Error('Kafka payload must not be null or undefined');
    }

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
