const { createClient } = require('redis');

let redisClient;

async function initRedis() {
  redisClient = createClient({
    url: process.env.REDIS_URL 
  });

  redisClient.on('error', (err) => {
    console.error('Redis Client Error:', err);
  });

  await redisClient.connect();
  return redisClient;
}

function getRedis() {
  if (!redisClient) {
    throw new Error('Redis not initialized');
  }
  return redisClient;
}

module.exports = {
  initRedis,
  getRedis
};
