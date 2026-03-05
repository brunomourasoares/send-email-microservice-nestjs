import { KafkaContext } from '@nestjs/microservices';
import { KafkaMessage } from 'kafkajs';
import { KAFKA_TOPICS } from '../../src/shared/kafka/kafka-topics';

export type CommitOffsetsMock = jest.Mock<Promise<void>, []>;
export type ConsumerMock = { commitOffsets: CommitOffsetsMock };

export interface BuildContextOverrides {
  offset?: string;
  headers?: Record<string, Buffer | string>;
}

export function buildKafkaContext(
  overrides: BuildContextOverrides = {},
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
