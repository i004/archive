import { Request, Response } from "express";

const ERROR_MESSAGES = {
    INVALID_CHOICE: (allowedChoices: string[]) => `Value must be one of (${allowedChoices.join(', ')})`,
    TYPE_MISMATCH: (expectedType: string) => `Invalid type (expected ${expectedType})`,
    VALUE_NOT_IN_RANGE: (range: [number, number]) => `Value should be in range [${range[0]}, ${range[1]}]`,
    FIELD_REQUIRED: () => `This field is required`,
    INVALID_VALUE: () => `Invalid value`
}

type Errors = typeof ERROR_MESSAGES;
type Error = { code?: keyof Errors, option?: unknown, errors?: Record<string, Error> };
type FormattedError = Record<string, Error> | { code: keyof Errors, message: string };

export class APIError extends Error {
    public readonly code: number;

    constructor (message: string = undefined, code: number) {
        super(message);

        this.code = code;
    }

    toJSON () {
        return {
            code: this.code,
            message: this.message
        };
    }
}

export class AdvancedAPIError extends APIError {
    public errors: Record<string, FormattedError>;

    constructor (message: string, code: number, errors: Record<string, FormattedError> = {}) {
        super(message, code);

        this.errors = errors;
    }

    private _formatError (value: Error): FormattedError {
        if (value.errors)
            return Object.entries(value.errors)
                .reduce((obj, [k, v]) => obj[k] = this._formatError(v), {});
        
        const f = ERROR_MESSAGES[value.code] as (option: unknown) => string;

        return {
            code: value.code,
            message: f(value.option)
        }
    }

    addErrors (errors: Record<string, Error>) {
        for (const key in errors)
            this.errors[key] = this._formatError(errors[key]);

        return this;
    }

    toJSON () {
        return {
            code: this.code,
            errors: this.errors,
            message: this.message
        };
    }
}