import { Test, TestingModule } from '@nestjs/testing';
import { INestMicroservice } from '@nestjs/common';
import { MicroserviceOptions, Transport } from '@nestjs/microservices';
import { AppModule } from '../src/app.module';

describe('Email Microservice (e2e)', () => {
  let app: INestMicroservice;

  beforeAll(async (): Promise<void> => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestMicroservice<MicroserviceOptions>({
      transport: Transport.KAFKA,
      options: {
        client: {
          clientId: 'email-service-test',
          brokers: ['localhost:9092'],
        },
        consumer: {
          groupId: 'email-service-test-group',
        },
      },
    });
  });

  afterAll(async (): Promise<void> => {
    await app?.close();
  });

  it('should compile the module without errors', (): void => {
    expect(app).toBeDefined();
  });
});
