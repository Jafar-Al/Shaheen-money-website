/**
 * The two ways a data source says it cannot answer. Kept apart from
 * data-source.ts so shaheen-source.ts can throw them without importing the
 * module that chooses between sources.
 */

/** Thrown by a source that is not connected yet: the API answers 503 not_connected. */
export class NotConnectedError extends Error {
  constructor(what = 'The Shaheen app’s data is not connected to the console yet.') {
    super(what);
    this.name = 'NotConnectedError';
  }
}

/**
 * Thrown by an action the app refuses for a reason the admin should read
 * (insufficient funds in the master wallet, a transaction that cannot be
 * refunded, a user who cannot receive money): the API answers 422 with the
 * code and the message.
 */
export class ActionRefusedError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
    this.name = 'ActionRefusedError';
  }
}

/** Thrown for a temporary failure (the database did not answer): the API answers 503, retryable. */
export class SourceUnavailableError extends Error {
  constructor(message = 'The data source did not answer.') {
    super(message);
    this.name = 'SourceUnavailableError';
  }
}
