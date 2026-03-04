export class EmailAddress {
  constructor(readonly value: string) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      throw new Error('Invalid email address');
    }
  }
}
