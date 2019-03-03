"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// IMPORTS
// ================================================================================================
const core_1 = require("@nova/core");
// ERRORS
// ================================================================================================
class TooManyRequestsError extends core_1.Exception {
    constructor(id, retryAfter) {
        super(`Rate limit exceeded for '${id}'`, 429 /* TooManyRequests */);
        this.id = id;
        this.retryAfter = retryAfter;
        this.headers = { 'Retry-After': retryAfter.toString() };
    }
    toJSON() {
        return {
            name: this.name,
            message: this.message,
            retryAfter: this.retryAfter
        };
    }
}
exports.TooManyRequestsError = TooManyRequestsError;
class RateLimiterError extends core_1.Exception {
    constructor(cause, message) {
        super({ cause, message });
    }
}
exports.RateLimiterError = RateLimiterError;
//# sourceMappingURL=errors.js.map