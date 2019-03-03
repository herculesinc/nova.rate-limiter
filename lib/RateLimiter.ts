// IMPORTS
// ================================================================================================
import * as events from 'events';
import * as redis from 'redis';
import * as uuid from 'uuid/v4';
import * as nova from '@nova/core';
import { RateLimiter as IRateLimiter, RateLimiterConfig, RateOptions, Logger, TraceSource, TraceCommand } from '@nova/rate-limiter';
import { RateLimiterError, TooManyRequestsError } from './errors';

// MODULE VARIABLES
// ================================================================================================
const ERROR_EVENT = 'error';

// CLASS DEFINITION
// ================================================================================================
export class RateLimiter extends events.EventEmitter implements IRateLimiter {

    private readonly source         : TraceSource;
    private readonly client         : redis.RedisClient;
	logger?	: Logger;

	constructor(config: RateLimiterConfig, logger?: Logger) {
		super();

        if (!config) throw TypeError('Cannot create Rate Limiter: config is undefined');
        if (!config.redis) throw TypeError('Cannot create Rate Limiter: redis settings are undefined');

        this.source = { name: config.name || 'rate-limiter', type: 'redis' };
        this.client = redis.createClient(config.redis);
        
        // listen to error event
        this.client.on('error', (error) => {
            this.emit(ERROR_EVENT, new RateLimiterError(error, 'Rate Limiter error'));
        });
	}
	
	try(id: string, options: RateOptions, logger?: Logger): Promise<any> {
		if (!id) throw new TypeError('Cannot check rate limit: id is undefined');
		if (!options) throw new TypeError('Cannot check rate limit: options are undefined');

        const start = Date.now();
        if (logger === undefined) {
            logger = nova.logger;
        }

        const command: TraceCommand = {
            name    : 'try',
            text    : `try ${id} {${options.window}: ${options.limit}}`
        };

		logger && logger.debug(`Checking rate limit for '${id}'`);		
		return new Promise((resolve, reject) => {
			const requestId = uuid();
			const timestamp = Date.now();
			const key = `nova::rate-limiter::${id}`;
			this.client.eval(script, 1, key, requestId, timestamp, options.window, options.limit, (error, result) => {
				this.logger && this.logger.trace(this.source, command, Date.now() - start, !error);
				if (error) {
					error = new RateLimiterError(error, 'Failed to check rate limit');
					return reject(error);
				}

				if (result !== 0) {
					return reject(new TooManyRequestsError(id, result));
				}
				
				resolve();
			});
		});
	}
}

// LUA SCRIPT
// ================================================================================================
const script = `
    local requestId = ARGV[1]
	local timestamp = tonumber(ARGV[2])
	local window = tonumber(ARGV[3])
	local limit = tonumber(ARGV[4])
	local retryAfter = 0
	if redis.call("EXISTS", KEYS[1]) == 1 then
		redis.call("ZREMRANGEBYSCORE", KEYS[1], 0, timestamp - window * 1000)
		if redis.call("ZCARD", KEYS[1]) >= limit then
			redis.call("ZREMRANGEBYRANK", KEYS[1], 0, 0)
			local firstTimestamp = tonumber(redis.call("ZRANGE", KEYS[1], 0, 0, "WITHSCORES")[2])
			retryAfter = window - math.ceil((timestamp - firstTimestamp) / 1000)
		end
	end
	redis.call("ZADD", KEYS[1], timestamp, requestId)
	redis.call("EXPIRE", KEYS[1], window)
	return retryAfter
`;