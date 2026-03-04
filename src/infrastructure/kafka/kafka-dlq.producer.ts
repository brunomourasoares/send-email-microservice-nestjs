import { Injectable } from '@nestjs/common';
import { Kafka, Producer } from 'kafkajs';

@Injectable()
export class KafkaDlqProducer {
  private readonly producer: Producer;

  constructor() {
    const kafka = new Kafka({
      clientId: process.env.KAFKA_CLIENT_ID ?? 'email-service-dlq',
      brokers: process.env.KAFKA_BROKERS!.split(','),
    });

    this.producer = kafka.producer();
  }

  async send(
    topic: string,
    payload: unknown,
    headers?: Record<string, string>,
  ): Promise<void> {
    await this.producer.connect();
    await this.producer.send({
      topic,
      messages: [
        {
          value: JSON.stringify(payload),
          headers,
        },
      ],
    });
    await this.producer.disconnect();
  }
}
