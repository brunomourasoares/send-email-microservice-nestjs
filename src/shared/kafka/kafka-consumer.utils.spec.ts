import { KafkaContext } from '@nestjs/microservices';
import { KafkaMessage } from 'kafkajs';
import { commitOffset, isValidSendEmailPayload } from './kafka-consumer.utils';
import { KAFKA_TOPICS } from './kafka-topics';
import {
  buildKafkaContext,
  ConsumerMock,
} from '../../../test/helpers/kafka-context.fixture';

describe('isValidSendEmailPayload', (): void => {
  it('should return true for a valid payload', (): void => {
    expect(
      isValidSendEmailPayload({
        to: 'user@example.com',
        subject: 'Hello',
        body: 'Body',
      }),
    ).toBe(true);
  });

  it('should return false for null', (): void => {
    expect(isValidSendEmailPayload(null)).toBe(false);
  });

  it('should return false for a non-object', (): void => {
    expect(isValidSendEmailPayload('string')).toBe(false);
  });

  it('should return false when "to" is empty', (): void => {
    expect(
      isValidSendEmailPayload({ to: '  ', subject: 'Hello', body: 'Body' }),
    ).toBe(false);
  });

  it('should return false when "subject" is empty', (): void => {
    expect(
      isValidSendEmailPayload({
        to: 'user@example.com',
        subject: '',
        body: 'Body',
      }),
    ).toBe(false);
  });

  it('should return false when "body" is empty', (): void => {
    expect(
      isValidSendEmailPayload({
        to: 'user@example.com',
        subject: 'Hello',
        body: '   ',
      }),
    ).toBe(false);
  });

  it('should return false when fields are missing', (): void => {
    expect(isValidSendEmailPayload({})).toBe(false);
  });
});

describe('commitOffset', (): void => {
  it('should commit the next offset', async (): Promise<void> => {
    const context: jest.Mocked<KafkaContext> = buildKafkaContext({
      offset: '5',
    });
    const message: KafkaMessage = context.getMessage() as KafkaMessage;

    await commitOffset(context, message);

    const { commitOffsets }: ConsumerMock =
      context.getConsumer() as unknown as ConsumerMock;

    expect(commitOffsets).toHaveBeenCalledWith([
      { topic: KAFKA_TOPICS.SEND_EMAIL, partition: 0, offset: '6' },
    ]);
  });
});
