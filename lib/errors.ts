/**
 * Base application error with structured context
 */
export class AppError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly context?: Record<string, unknown>;

  constructor(message: string, code: string, statusCode = 500, context?: Record<string, unknown>) {
    super(message);
    this.name = 'AppError';
    this.code = code;
    this.statusCode = statusCode;
    this.context = context;
  }
}

/**
 * HTTP API failure
 */
export class ApiError extends AppError {
  constructor(message: string, statusCode: number, context?: Record<string, unknown>) {
    super(message, 'API_ERROR', statusCode, context);
    this.name = 'ApiError';
  }
}

/**
 * WebSocket or WebRTC connection failure
 */
export class ConnectionError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'CONNECTION_ERROR', 503, context);
    this.name = 'ConnectionError';
  }
}

/**
 * Input validation failure
 */
export class ValidationError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'VALIDATION_ERROR', 400, context);
    this.name = 'ValidationError';
  }
}

/**
 * D-ID streaming failure
 */
export class StreamingError extends AppError {
  constructor(message: string, context?: Record<string, unknown>) {
    super(message, 'STREAMING_ERROR', 502, context);
    this.name = 'StreamingError';
  }
}
