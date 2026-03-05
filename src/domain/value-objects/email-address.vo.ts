export class EmailAddress {
  readonly value: string;

  constructor(value: string) {
    const trimmed: string = value.trim();

    if (!trimmed) {
      throw new Error('Email address must not be empty');
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      throw new Error('Invalid email address');
    }

    this.value = trimmed;
  }
}
