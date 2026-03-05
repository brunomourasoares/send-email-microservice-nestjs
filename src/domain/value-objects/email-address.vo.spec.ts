import { EmailAddress } from './email-address.vo';

describe('EmailAddress', () => {
  it('should create a valid email address', () => {
    const email: EmailAddress = new EmailAddress('user@example.com');
    expect(email.value).toBe('user@example.com');
  });

  it('should throw for an address without @', () => {
    expect(() => new EmailAddress('invalid-email')).toThrow(
      'Invalid email address',
    );
  });

  it('should throw for an address without domain', () => {
    expect(() => new EmailAddress('user@')).toThrow('Invalid email address');
  });

  it('should throw for an empty string', () => {
    expect(() => new EmailAddress('')).toThrow('Invalid email address');
  });

  it('should throw for an address with spaces', () => {
    expect(() => new EmailAddress('user @example.com')).toThrow(
      'Invalid email address',
    );
  });
});
