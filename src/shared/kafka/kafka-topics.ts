export const KAFKA_TOPICS = {
  SEND_EMAIL: 'send-email',
  SEND_EMAIL_RETRY: 'send-email-retry',
  SEND_EMAIL_DLQ: 'send-email-dlq',
} as const;

export type KafkaTopic = (typeof KAFKA_TOPICS)[keyof typeof KAFKA_TOPICS];
