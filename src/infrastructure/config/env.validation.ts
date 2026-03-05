import Joi, { ObjectSchema } from 'joi';
import { AppProfile } from '../../shared/enums/app-profile.enum';

export const envValidationSchema: ObjectSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid(...Object.values(AppProfile))
    .default(AppProfile.Development),

  KAFKA_BROKERS: Joi.string()
    .pattern(/^(\S+:\d+)(,\S+:\d+)*$/)
    .required()
    .messages({
      'string.pattern.base':
        'KAFKA_BROKERS must be a comma-separated list of host:port (e.g. localhost:9092)',
    }),
  KAFKA_CLIENT_ID: Joi.string().min(1).required(),
  KAFKA_CONSUMER_GROUP: Joi.string().min(1).required(),

  MAIL_HOST: Joi.string().min(1).required(),
  MAIL_PORT: Joi.number().integer().min(1).max(65535).required(),
  MAIL_USER: Joi.string().allow('').default(''),
  MAIL_PASS: Joi.string().allow('').default(''),
  MAIL_FROM: Joi.string()
    .pattern(/^.*<[^\s@]+@[^\s@]+\.[^\s@]+>$|^[^\s@]+@[^\s@]+\.[^\s@]+$/)
    .required()
    .messages({
      'string.pattern.base':
        'MAIL_FROM must be a valid email or format "Name <email@example.com>"',
    }),
  MAIL_IGNORE_TLS: Joi.boolean().default(false),
});
