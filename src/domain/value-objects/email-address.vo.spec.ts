import { EmailAddress } from './email-address.vo';

describe('EmailAddress', () => {
  it('should create a valid email address', (): void => {
    const email: EmailAddress = new EmailAddress('user@example.com');
    expect(email.value).toBe('user@example.com');
  });

  it('should trim whitespace from a valid email address', (): void => {
    const email: EmailAddress = new EmailAddress('  user@example.com  ');
    expect(email.value).toBe('user@example.com');
  });

  it('should throw for an address without @', (): void => {
    expect(() => new EmailAddress('invalid-email')).toThrow(
      'Invalid email address',
    );
  });

  it('should throw for an address without domain', (): void => {
    expect(() => new EmailAddress('user@')).toThrow('Invalid email address');
  });

  it('should throw for an empty string', (): void => {
    expect(() => new EmailAddress('')).toThrow(
      'Email address must not be empty',
    );
  });

  it('should throw for a whitespace-only string', (): void => {
    expect(() => new EmailAddress('   ')).toThrow(
      'Email address must not be empty',
    );
  });

  it('should throw for an address with spaces', (): void => {
    expect(() => new EmailAddress('user @example.com')).toThrow(
      'Invalid email address',
    );
  });
});
