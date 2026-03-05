import { EmailConsumer } from './email.consumer';
import { SendEmailUseCase } from '../../application/use-cases/send-email.use-case';
import { KafkaDlqProducer } from '../../infrastructure/kafka/kafka-dlq.producer';
import { KafkaContext } from '@nestjs/microservices';
import { KAFKA_TOPICS, KafkaTopic } from '../../shared/kafka/kafka-topics';
import { SendEmailEvent } from '../../shared/messaging/send-email.event';
import {
  buildKafkaContext,
  ConsumerMock,
} from '../../../test/helpers/kafka-context.fixture';

describe('EmailConsumer', () => {
  let consumer: EmailConsumer;
  let useCase: jest.Mocked<Pick<SendEmailUseCase, 'execute'>>;
  let dlqProducer: jest.Mocked<Pick<KafkaDlqProducer, 'send'>>;

  const payload: SendEmailEvent = {
    to: 'user@example.com',
    subject: 'Hello',
    body: '<p>Hi</p>',
  };

  beforeEach((): void => {
    useCase = {
      execute: jest
        .fn<Promise<void>, [SendEmailEvent]>()
        .mockResolvedValue(undefined),
    };
    dlqProducer = {
      send: jest
        .fn<Promise<void>, [KafkaTopic, unknown, Record<string, string>?]>()
        .mockResolvedValue(undefined),
    };
    consumer = new EmailConsumer(
      useCase as unknown as SendEmailUseCase,
      dlqProducer as unknown as KafkaDlqProducer,
    );
  });

  it('should send invalid payload directly to DLQ without retrying', async (): Promise<void> => {
    const invalidPayload: SendEmailEvent = { to: '', subject: '', body: '' };
    const context: jest.Mocked<KafkaContext> = buildKafkaContext();

    await consumer.handle(invalidPayload, context);

    expect(useCase.execute).not.toHaveBeenCalled();
    expect(dlqProducer.send).toHaveBeenCalledWith(
      KAFKA_TOPICS.SEND_EMAIL_DLQ,
      invalidPayload,
      expect.objectContaining({
        'x-error': expect.stringContaining('Invalid payload') as string,
      }),
    );
  });

  it('should call use case and commit offset on success', async (): Promise<void> => {
    const context: jest.Mocked<KafkaContext> = buildKafkaContext();
    await consumer.handle(payload, context);

    const { commitOffsets }: ConsumerMock =
      context.getConsumer() as unknown as ConsumerMock;

    expect(useCase.execute).toHaveBeenCalledWith(payload);
    expect(commitOffsets).toHaveBeenCalledWith([
      { topic: KAFKA_TOPICS.SEND_EMAIL, partition: 0, offset: '1' },
    ]);
    expect(dlqProducer.send).not.toHaveBeenCalled();
  });

  it('should publish to retry topic on first failure', async (): Promise<void> => {
    useCase.execute.mockRejectedValueOnce(new Error('SMTP error'));
    const context: jest.Mocked<KafkaContext> = buildKafkaContext({
      headers: { 'x-retry-count': '0' },
    });

    await consumer.handle(payload, context);

    expect(dlqProducer.send).toHaveBeenCalledWith(
      KAFKA_TOPICS.SEND_EMAIL_RETRY,
      payload,
      expect.objectContaining({ 'x-retry-count': '1' }),
    );
  });

  it('should publish to DLQ when max retries exceeded', async (): Promise<void> => {
    useCase.execute.mockRejectedValueOnce(new Error('SMTP error'));
    const context: jest.Mocked<KafkaContext> = buildKafkaContext({
      headers: { 'x-retry-count': '3' },
    });

    await consumer.handle(payload, context);

    expect(dlqProducer.send).toHaveBeenCalledWith(
      KAFKA_TOPICS.SEND_EMAIL_DLQ,
      payload,
      expect.objectContaining({ 'x-error': 'SMTP error' }),
    );
  });

  it('should always commit offset even on failure', async (): Promise<void> => {
    useCase.execute.mockRejectedValueOnce(new Error('fail'));
    const context: jest.Mocked<KafkaContext> = buildKafkaContext();

    await consumer.handle(payload, context);

    const { commitOffsets }: ConsumerMock =
      context.getConsumer() as unknown as ConsumerMock;

    expect(commitOffsets).toHaveBeenCalled();
  });
});
