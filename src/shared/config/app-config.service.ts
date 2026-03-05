import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppEnvironment } from '../interfaces/app.environment';

@Injectable()
export class AppConfigService {
  constructor(
    private readonly configService: ConfigService<AppEnvironment, true>,
  ) {}

  get nodeEnv(): AppEnvironment['NODE_ENV'] {
    return this.configService.getOrThrow('NODE_ENV');
  }

  get kafkaBrokers(): string[] {
    const raw: string = this.configService.getOrThrow('KAFKA_BROKERS');
    return raw.split(',').map((broker: string): string => broker.trim());
  }

  get kafkaClientId(): string {
    return this.configService.getOrThrow('KAFKA_CLIENT_ID');
  }

  get kafkaConsumerGroup(): string {
    return this.configService.getOrThrow('KAFKA_CONSUMER_GROUP');
  }

  get mailHost(): string {
    return this.configService.getOrThrow('MAIL_HOST');
  }

  get mailPort(): number {
    return this.configService.getOrThrow('MAIL_PORT');
  }

  get mailUser(): string {
    return this.configService.getOrThrow('MAIL_USER');
  }

  get mailPass(): string {
    return this.configService.getOrThrow('MAIL_PASS');
  }

  get mailFrom(): string {
    return this.configService.getOrThrow('MAIL_FROM');
  }

  get mailIgnoreTls(): boolean {
    return this.configService.getOrThrow('MAIL_IGNORE_TLS');
  }
}
