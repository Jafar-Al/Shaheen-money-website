import type { AuthErrorCode } from '../types/admin';

/**
 * Failures the console knows how to show. Every service call rejects with
 * an ApiError, whatever went wrong underneath, so each screen has one error
 * state to design rather than one per cause.
 */
export type ApiErrorCode =
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'unavailable'
  | 'timeout'
  | 'network'
  | 'bad_response'
  | 'aborted'
  /** The server's data source is not connected to the Shaheen app yet. */
  | 'not_connected'
  | 'bad_request';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;
  /** Whether trying again might work (a retry button is offered). */
  readonly retryable: boolean;

  constructor(code: ApiErrorCode, status = 0, message?: string) {
    super(message ?? DEFAULT_MESSAGE[code]);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.retryable = code === 'unavailable' || code === 'timeout' || code === 'network' || code === 'bad_response';
  }
}

const DEFAULT_MESSAGE: Record<ApiErrorCode, string> = {
  unauthorized: 'Your session has ended. Sign in again to continue.',
  forbidden: 'Your role does not include access to this information.',
  not_found: 'This record no longer exists, or the link is wrong.',
  unavailable: 'The Shaheen admin service did not respond as expected.',
  timeout: 'The Shaheen admin service took too long to answer.',
  network: 'The admin service could not be reached. Check the connection.',
  bad_response: 'The admin service sent a response the console could not read.',
  aborted: 'The request was cancelled.',
  not_connected: 'The Shaheen app’s data is not connected to the console yet.',
  bad_request: 'The console asked for something the server does not accept.',
};

export class AuthError extends Error {
  readonly code: AuthErrorCode;
  /** For rate limiting: when another attempt is allowed. */
  readonly retryAfterSeconds: number | undefined;

  constructor(code: AuthErrorCode, retryAfterSeconds?: number) {
    super(code);
    this.name = 'AuthError';
    this.code = code;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

export const isAbort = (e: unknown) => e instanceof ApiError && e.code === 'aborted';
