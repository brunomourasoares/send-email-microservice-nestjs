import { EmailConsumer } from './email.consumer';
import { SendEmailUseCase } from '../../application/use-cases/send-email.use-case';
import { KafkaDlqProducer } from '../../infrastructure/kafka/kafka-dlq.producer';
import { KafkaContext } from '@nestjs/microservices';
import { KAFKA_TOPICS } from '../../shared/kafka/kafka-topics';
import { SendEmailEvent } from '../events/send-email.event';
import { KafkaMessage } from 'kafkajs';

type CommitOffsetsMock = jest.Mock<Promise<void>, []>;
type ConsumerMock = { commitOffsets: CommitOffsetsMock };

function buildContext(
  overrides: Partial<{
    offset: string;
    headers: Record<string, Buffer | string>;
  }> = {},
): jest.Mocked<KafkaContext> {
  const message: Partial<KafkaMessage> = {
    offset: overrides.offset ?? '0',
    headers: overrides.headers ?? {},
  };
  const commitOffsets: CommitOffsetsMock = jest
    .fn<Promise<void>, []>()
    .mockResolvedValue(undefined);
  return {
    getMessage: jest.fn<Partial<KafkaMessage>, []>().mockReturnValue(message),
    getTopic: jest.fn<string, []>().mockReturnValue(KAFKA_TOPICS.SEND_EMAIL),
    getPartition: jest.fn<number, []>().mockReturnValue(0),
    getConsumer: jest.fn<ConsumerMock, []>().mockReturnValue({ commitOffsets }),
  } as unknown as jest.Mocked<KafkaContext>;
}

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
        .fn<Promise<void>, [string, unknown, Record<string, string>?]>()
        .mockResolvedValue(undefined),
    };
    consumer = new EmailConsumer(
      useCase as unknown as SendEmailUseCase,
      dlqProducer as unknown as KafkaDlqProducer,
    );
  });

  it('should call use case and commit offset on success', async (): Promise<void> => {
    const context: jest.Mocked<KafkaContext> = buildContext();
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
    const context: jest.Mocked<KafkaContext> = buildContext({
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
    const context: jest.Mocked<KafkaContext> = buildContext({
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
    const context: jest.Mocked<KafkaContext> = buildContext();

    await consumer.handle(payload, context);

    const { commitOffsets }: ConsumerMock =
      context.getConsumer() as unknown as ConsumerMock;

    expect(commitOffsets).toHaveBeenCalled();
  });
});
