import { profile } from './shared/config/profile';
import { NestFactory } from '@nestjs/core';
import { AppModule, buildKafkaMicroserviceOptions } from './app.module';
import { INestApplication, Logger } from '@nestjs/common';
import { AppConfigService } from './shared/config/app-config.service';

async function bootstrap(): Promise<void> {
  const logger: Logger = new Logger('Bootstrap');
  logger.log(`Starting application with profile: ${profile}`);

  const app: INestApplication = await NestFactory.create(AppModule, {
    logger: false,
  });

  const config: AppConfigService = app.get(AppConfigService);

  app.connectMicroservice(buildKafkaMicroserviceOptions(config));

  await app.startAllMicroservices();
  logger.log('Microservice is listening');
}

bootstrap().catch((err: unknown) => {
  console.error('Erro ao iniciar o microserviço:', err);
  process.exit(1);
});
