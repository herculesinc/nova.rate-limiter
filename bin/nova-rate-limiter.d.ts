declare module "@nova/rate-limiter" {
    
    // IMPORTS AND RE-EXPORTS
    // --------------------------------------------------------------------------------------------
    import * as events from 'events';
    import * as tls from 'tls';

    import { Logger, Exception } from '@nova/core';
    export { Logger, TraceSource, TraceCommand } from '@nova/core';

    // REDIS CONNECTION
    // --------------------------------------------------------------------------------------------
    export interface RedisConnectionConfig {
        host            : string;
        port            : number;
        password        : string;
        prefix?         : string;
        tls?            : tls.ConnectionOptions;
        retry_strategy? : (options: ConnectionRetryOptions) => number | Error;
    }

    export interface ConnectionRetryOptions {
        error           : any;
        attempt         : number;
        total_retry_time: number;
        times_connected : number;
    }

    // RATE LIMITER
    // --------------------------------------------------------------------------------------------
    export interface RateLimiterConfig {
        name?           : string;
        redis           : RedisConnectionConfig;
    }

    export interface RateOptions {
        window          : number;       // rate window in seconds
        limit           : number;       // max number of operations during the window
    }
    
    export class RateLimiter extends events.EventEmitter {
        constructor(config: RateLimiterConfig);
        
        try(id: string, options: RateOptions, logger?: Logger): Promise<any>;
        
        on(event: 'error', listener: (error: RateLimiterError) => void): this;
    }

    // ERRORS
    // --------------------------------------------------------------------------------------------
    export class RateLimiterError extends Exception {
        constructor(cause: Error, message: string);
    }

    export class TooManyRequestsError extends Exception {
        readonly id         : string;
        readonly retryAfter : number;

        constructor(id: string, retryAfter: number);
    }
}