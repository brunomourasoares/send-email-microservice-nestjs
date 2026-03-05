import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { AppModule, buildKafkaMicroserviceOptions } from '../src/app.module';
import { AppConfigService } from '../src/shared/config/app-config.service';

describe('Email Microservice (e2e)', () => {
  let app: INestApplication;

  beforeAll(async (): Promise<void> => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();

    const config: AppConfigService = app.get(AppConfigService);
    app.connectMicroservice(buildKafkaMicroserviceOptions(config));
  });

  afterAll(async (): Promise<void> => {
    await app?.close();
  });

  it('should compile the module without errors', (): void => {
    expect(app).toBeDefined();
  });
});
