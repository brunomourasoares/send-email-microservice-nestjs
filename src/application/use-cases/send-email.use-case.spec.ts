import { SendEmailUseCase } from './send-email.use-case';
import { EmailSenderPort } from '../../domain/ports/email-sender.port';
import { Email } from '../../domain/entities/email.entity';

type SendMock = jest.MockedFunction<
  (this: void, email: Email) => Promise<void>
>;

describe('SendEmailUseCase', () => {
  let useCase: SendEmailUseCase;
  let sendMock: SendMock;
  let emailSender: EmailSenderPort;

  beforeEach((): void => {
    sendMock = jest.fn<Promise<void>, [Email]>().mockResolvedValue(undefined);
    emailSender = { send: sendMock };
    useCase = new SendEmailUseCase(emailSender);
  });

  it('should call emailSender.send with the correct Email entity', async (): Promise<void> => {
    await useCase.execute({
      to: 'user@example.com',
      subject: 'Test Subject',
      body: '<p>Hello</p>',
    });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const sentEmail: Email = sendMock.mock.calls[0][0];
    expect(sentEmail.to.value).toBe('user@example.com');
    expect(sentEmail.subject).toBe('Test Subject');
    expect(sentEmail.body).toBe('<p>Hello</p>');
  });

  it('should throw when the email address is invalid', async (): Promise<void> => {
    await expect(
      useCase.execute({
        to: 'not-an-email',
        subject: 'Test',
        body: 'body',
      }),
    ).rejects.toThrow('Invalid email address');

    expect(sendMock).not.toHaveBeenCalled();
  });

  it('should propagate errors thrown by emailSender.send', async (): Promise<void> => {
    sendMock.mockRejectedValueOnce(new Error('SMTP error'));

    await expect(
      useCase.execute({
        to: 'user@example.com',
        subject: 'Test',
        body: 'body',
      }),
    ).rejects.toThrow('SMTP error');
  });
});
