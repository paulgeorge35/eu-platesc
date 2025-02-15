export class EuPlatescError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EuPlatescError';
  }
}