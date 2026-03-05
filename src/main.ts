import { profile } from './shared/config/profile';
import { NestFactory } from '@nestjs/core';
import { AppModule, buildKafkaMicroserviceOptions } from './app.module';
import { INestMicroservice, Logger } from '@nestjs/common';
import { KafkaOptions } from '@nestjs/microservices';
import { AppConfigService } from './shared/config/app-config.service';

async function bootstrap(): Promise<void> {
  const logger: Logger = new Logger('Bootstrap');
  logger.log(`Starting application with profile: ${profile}`);

  const appContext = await NestFactory.createApplicationContext(AppModule);
  const config: AppConfigService = appContext.get(AppConfigService);
  await appContext.close();

  const app: INestMicroservice =
    await NestFactory.createMicroservice<KafkaOptions>(
      AppModule,
      buildKafkaMicroserviceOptions(config),
    );

  await app.listen();
  logger.log('Microservice is listening');
}

bootstrap().catch((err: unknown) => {
  console.error('Erro ao iniciar o microserviço:', err);
  process.exit(1);
});
