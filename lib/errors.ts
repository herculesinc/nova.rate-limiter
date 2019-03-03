// IMPORTS
// ================================================================================================
import { Exception, HttpStatusCode } from '@nova/core';

// ERRORS
// ================================================================================================
export class TooManyRequestsError extends Exception {
	id			: string;
	retryAfter	: number;
	
    constructor(id: string, retryAfter: number) {
        super(`Rate limit exceeded for '${id}'`, HttpStatusCode.TooManyRequests);

		this.id = id;
		this.retryAfter = retryAfter;
		this.headers = { 'Retry-After': retryAfter.toString() };
    }

    toJSON(): any {
        return {
            name    	: this.name,
            message 	: this.message,
			retryAfter	: this.retryAfter
        };
    }
}

export class RateLimiterError extends Exception {
    constructor(cause: Error, message: string) {
        super({ cause, message });
    }
}