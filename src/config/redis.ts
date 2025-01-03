import Redis from 'ioredis';

export const redisConfig = {
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT!),
  username: process.env.REDIS_USERNAME,
  password: process.env.REDIS_PASSWORD,
};

const redisClient = new Redis(redisConfig);

export const redis = {
  client: redisClient,
};
