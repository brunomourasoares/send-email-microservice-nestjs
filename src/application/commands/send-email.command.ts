export interface SendEmailCommand {
  to: string;
  subject: string;
  body: string;
  bodyText?: string;
}
