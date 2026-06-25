export class QuickpayError extends Error {
    constructor(
        public readonly errorCode: string,
        public readonly httpStatus: number,
        message: string,
    ) {
        super(message);
        this.name = 'QuickpayError';
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

export class AuthError extends QuickpayError {
    constructor(errorCode: string, httpStatus: number, message: string) {
        super(errorCode, httpStatus, message);
        this.name = 'AuthError';
    }
}

export class ValidationError extends QuickpayError {
    constructor(
        errorCode: string,
        httpStatus: number,
        message: string,
        public readonly errors: Record<string, string[]>,
    ) {
        super(errorCode, httpStatus, message);
        this.name = 'ValidationError';
    }
}

export class RateLimitError extends QuickpayError {
    constructor(
        errorCode: string,
        httpStatus: number,
        message: string,
        public readonly retryAfter: number,
    ) {
        super(errorCode, httpStatus, message);
        this.name = 'RateLimitError';
    }
}

export class NotFoundError extends QuickpayError {
    constructor(errorCode: string, httpStatus: number, message: string) {
        super(errorCode, httpStatus, message);
        this.name = 'NotFoundError';
    }
}

export class ApiError extends QuickpayError {
    constructor(errorCode: string, httpStatus: number, message: string) {
        super(errorCode, httpStatus, message);
        this.name = 'ApiError';
    }
}
