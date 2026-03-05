import { AppProfile } from '../enums/app-profile.enum';

export interface AppEnvironment {
  NODE_ENV: AppProfile;
  KAFKA_BROKERS: string;
  KAFKA_CLIENT_ID: string;
  KAFKA_CONSUMER_GROUP: string;
  MAIL_HOST: string;
  MAIL_PORT: string;
  MAIL_USER: string;
  MAIL_PASS: string;
  MAIL_FROM: string;
}
