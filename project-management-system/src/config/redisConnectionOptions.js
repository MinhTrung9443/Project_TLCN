const Redis = require("ioredis");
const { URL } = require("url");

function isSecureRedisUrl(redisUrl) {
  if (!redisUrl) return false;
  try {
    const parsed = new URL(redisUrl);
    return parsed.protocol === "rediss:" || parsed.hostname.endsWith(".upstash.io");
  } catch (err) {
    return false;
  }
}

function parseRedisUrl(redisUrl) {
  if (!redisUrl) return {};

  const parsed = new URL(redisUrl);
  const redisConfig = {
    host: parsed.hostname,
    port: parsed.port ? Number(parsed.port) : 6379,
    db: parsed.pathname && parsed.pathname !== "/" ? Number(parsed.pathname.slice(1)) : 0,
  };

  if (parsed.username) {
    redisConfig.username = parsed.username;
  }

  if (parsed.password) {
    redisConfig.password = parsed.password;
  }

  parsed.searchParams.forEach((value, key) => {
    redisConfig[key] = value;
  });

  return redisConfig;
}

function createBullRedisOptions(redisUrl) {
  const isSecure = isSecureRedisUrl(redisUrl);
  const parsedRedisConfig = parseRedisUrl(redisUrl);

  const redisConfig = {
    ...parsedRedisConfig,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 10000,
    retryStrategy(times) {
      return Math.min(1000 * Math.pow(2, times), 30000);
    },
    reconnectOnError(err) {
      if (!err || !err.message) return false;
      return /EPIPE|ECONNRESET|ETIMEDOUT|READONLY/i.test(err.message) ? 1000 : false;
    },
  };

  if (isSecure) {
    redisConfig.tls = { rejectUnauthorized: false };
  }

  return {
    redis: redisConfig,
    createClient(type, config) {
      const clientConfig = {
        ...config,
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
        connectTimeout: 10000,
        retryStrategy: redisConfig.retryStrategy,
        reconnectOnError: redisConfig.reconnectOnError,
      };

      if (isSecure) {
        clientConfig.tls = { rejectUnauthorized: false };
      }

      return new Redis(clientConfig);
    },
  };
}

module.exports = {
  createBullRedisOptions,
};
