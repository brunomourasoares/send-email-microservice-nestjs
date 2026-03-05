import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { INestMicroservice, Logger } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppProfile } from './shared/enums/app-profile.enum';

function getKafkaBrokers(): string[] {
  const brokers: string | undefined = process.env.KAFKA_BROKERS;

  if (!brokers) {
    throw new Error('KAFKA_BROKERS environment variable is required');
  }

  return brokers.split(',').map((broker: string) => broker.trim());
}

async function bootstrap(): Promise<void> {
  const profile: AppProfile =
    (process.env.NODE_ENV as AppProfile) ?? AppProfile.Development;

  const logger: Logger = new Logger('Bootstrap');
  logger.log(`Starting application with profile: ${profile}`);

  const app: INestMicroservice =
    await NestFactory.createMicroservice<MicroserviceOptions>(AppModule, {
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: process.env.KAFKA_CLIENT_ID ?? 'email-service',
          brokers: getKafkaBrokers(),
        },
        consumer: {
          groupId: process.env.KAFKA_CONSUMER_GROUP ?? 'email-service-group',
        },
      },
    });

  await app.listen();
  logger.log('Microservice is listening');
}

bootstrap().catch((err: unknown) => {
  console.error('Erro ao iniciar o microserviço:', err);
  process.exit(1);
});
