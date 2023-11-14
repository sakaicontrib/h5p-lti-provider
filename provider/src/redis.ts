import { Redis } from 'ioredis';
import RedisStore from "connect-redis";

var currentClient : Redis;

export const getRedisClient = () => {
	if (!currentClient) {
		currentClient =  new Redis(
			Number.parseInt(process.env.REDIS_PORT || '6379'),
			process.env.REDIS_HOST || 'localhost',
			{
					db: Number.parseInt(process.env.REDIS_DB_LTI || '1')
			}
		);
	}
	return currentClient;
};

export const getRedisSessionStore = () => {
	return new RedisStore({ client: getRedisClient() });
};

export const getRedisNonceStore = RedisNonceStore => {
	return new RedisNonceStore("consumer_key", getRedisClient());
};

export const closeInstance = callback => {
	if (currentClient) {
		currentClient.quit(callback);
	}
};