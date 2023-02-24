import { IDiagnose } from '../../types/common';

enum PostgresErrorCode {
    NOT_FOUND = 'NOT_FOUND',
    MULTIPLE_RECORDS = 'MULTIPLE_RECORDS',
    DUPLICATE_KEY = '23505',
    INVALID_INPUT = '22P02',
}

export class PostgresError extends Error {
    public readonly code: PostgresErrorCode;
    public readonly detail: string | undefined;

    public static get CODES() {
        return PostgresErrorCode;
    }

    constructor(code: string, message: string, detail?: string) {
        super(message);
        this.code = code as any;
        this.detail = detail;
        Error.captureStackTrace(this, this.constructor);
    }

    public get diagnose(): IDiagnose {
        return {
            severity: 'error',
            message: this.message,
            code: this.code,
            detail: this.detail,
            stack: this.stack,
        };
    }
}
