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

/** Thrown for a temporary failure (the database did not answer): the API answers 503, retryable. */
export class SourceUnavailableError extends Error {
  constructor(message = 'The data source did not answer.') {
    super(message);
    this.name = 'SourceUnavailableError';
  }
}
