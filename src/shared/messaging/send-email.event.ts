export interface SendEmailEvent {
  to: string;
  subject: string;
  body: string;
  bodyText?: string;
}
