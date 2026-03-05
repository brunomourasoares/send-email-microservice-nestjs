import { KafkaContext } from '@nestjs/microservices';
import { KafkaMessage } from 'kafkajs';
import { SendEmailEvent } from '../messaging/send-email.event';

export async function commitOffset(
  context: KafkaContext,
  message: KafkaMessage,
): Promise<void> {
  await context.getConsumer().commitOffsets([
    {
      topic: context.getTopic(),
      partition: context.getPartition(),
      offset: (Number(message.offset) + 1).toString(),
    },
  ]);
}

export function isValidSendEmailPayload(
  payload: unknown,
): payload is SendEmailEvent {
  if (typeof payload !== 'object' || payload === null) {
    return false;
  }

  const p: Record<string, unknown> = payload as Record<string, unknown>;

  return (
    typeof p['to'] === 'string' &&
    p['to'].trim().length > 0 &&
    typeof p['subject'] === 'string' &&
    p['subject'].trim().length > 0 &&
    typeof p['body'] === 'string' &&
    p['body'].trim().length > 0
  );
}
