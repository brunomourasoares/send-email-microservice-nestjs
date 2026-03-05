import { AppProfile } from '../enums/app-profile.enum';

export interface AppEnvironment {
  NODE_ENV: AppProfile;
  KAFKA_BROKERS: string;
  KAFKA_CLIENT_ID: string;
  KAFKA_CONSUMER_GROUP: string;
  MAIL_HOST: string;
  MAIL_PORT: number;
  MAIL_USER: string;
  MAIL_PASS: string;
  MAIL_FROM: string;
  MAIL_IGNORE_TLS: boolean;
}
