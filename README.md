In a nutshell, it acts as a toggle for features. Say you have an app and you deliver an update, say a new ui. If the new UI is broken you don't have to shut it down and have the app down, instead you can "flag" the update and toggle it to the old ui. Helps with user experience.

A lightweight, production-ready feature flag service for Node.js applications with Redis caching and support for PostgreSQL and MySQL. Designed for gradual rollouts, safe defaults, and minimal operational surprises.

Features:

-Database-backed feature flags (PostgreSQL or MySQL)
-Redis caching with TTL and jitter to reduce DB load.
-percentage-based rollouts per user
-Deterministic user targeting using hashing
-Safe failure behavior (Redis or DB failures default to disabled)
-Simple, framework-agnostic design

Requirements:

-Node.js 18+
-Redis (v6+ recommended)
-One of:
  PostgreSQL
  MySQL / MariaDB

Database Schema;

Example schema for the feature_flags table:

CREATE TABLE feature_flags (
  name VARCHAR(255) PRIMARY KEY,
  enabled BOOLEAN NOT NULL DEFAULT false,
  rollout_percentage INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_feature_flags_name ON feature_flags(name);


Notes:
rollout_percentage should be between 0 and 100%
enabled = false always disables the flag regardless of rollout

Installation:

Install required dependencies

-npm install redis


Your DB client (e.g. pg, mysql2) is assumed to already be installed.

Redis Setup:
redisSupport.js
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

Flag Service
flagservice.js

The FlagService handles:

Fetching flags from cache or DB

Normalizing values

Deterministic rollout decisions per user

Constructor
new FlagService({
  dbType: 'postgres' | 'mysql',
  db: dbClient,
  redis: redisClient,
  table?: 'feature_flags'
});

Use Example
const { initRedis } = require('./redisSupport');
const FlagService = require('./flagservice');

async function spongebob() {
  const redis = await initRedis();

  const flags = new FlagService({
    dbType: 'postgres',
    db: pgPool,
    redis
  });

  const isEnabled = await flags.isEnabled('new_checkout', {
    userId: 123
  });

  if (isEnabled) {
    // serve new feature
  } else {
    // fallback behavior
  }
}

spongebob();

Rollout Logic;

If the flag does not exist → disabled

If enabled = false → disabled

If rollout_percentage >= 100 → enabled for all users

Otherwise:

User ID is hashed

Hash is mapped to a number from 0–99

Feature is enabled if the value is below rollout_percentage

This ensures:

Stable user assignment

No reshuffling when rollout percentages change

Caching Behavior:

Redis key format: flag:<flagName>

TTL: ~30–40 seconds (with jitter)

Cache failures fall back to DB

Corrupted cache entries are automatically discarded

Failure Handling
Failure	Behavior
Redis down	Falls back to DB
DB down	Feature defaults to disabled
Invalid cache data	Cache is cleared
Missing userId	Feature disabled

The service always fails closed.

Notes

Table name is whitelisted to prevent SQL injection
Flags are intentionally simple. Targeting by region, plan, or role can be added later
This service is suitable for monoliths, APIs, and microservices
