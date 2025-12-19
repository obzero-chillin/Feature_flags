const crypto = require('crypto');

class FlagService {
  constructor({ dbType, db, redis, table = 'feature_flags' }) {
    const ALLOWED_TABLES = new Set(['feature_flags']);
    this.table = ALLOWED_TABLES.has(table) ? table : 'feature_flags';

    this.dbType = dbType;
    this.db = db;
    this.redis = redis;
  }

  async getFlag(flagName) {
    const cacheKey = `flag:${flagName}`;

    try {
      const cached = await this.redis.get(cacheKey);
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {
          await this.redis.del(cacheKey);
        }
      }
    } catch (err) {
      console.error('Redis get failed:', err.message);
    }

    let flag = null;

    try {
      switch (this.dbType) {
        case 'postgres': {
          const result = await this.db.query(
            `SELECT enabled, rollout_percentage FROM ${this.table} WHERE name = $1 LIMIT 1`,
            [flagName]
          );
          flag = result.rows[0] ?? null;
          break;
        }

        case 'mysql': {
          const [rows] = await this.db.query(
            `SELECT enabled, rollout_percentage FROM ${this.table} WHERE name = ? LIMIT 1`,
            [flagName]
          );
          flag = rows[0] ?? null;
          break;
        }

        default:
          throw new Error('Unsupported DB type');
      }
    } catch (err) {
      console.error('DB query failed:', err.message);
      return null;
    }

    if (flag) {
      flag.enabled = Boolean(flag.enabled);
      flag.rollout_percentage = Number(flag.rollout_percentage) || 0;

      try {
        const ttl = 30 + Math.floor(Math.random() * 10);
        await this.redis.set(cacheKey, JSON.stringify(flag), { EX: ttl });
      } catch (err) {
        console.error('Redis set failed:', err.message);
      }
    }

    return flag;
  }

  isEnabledForUser(userId, rollout) {
    const hash = crypto
      .createHash('sha256')
      .update(String(userId))
      .digest()
      .readUInt32BE(0);

    return (hash % 100) < rollout;
  }

  async isEnabled(flagName, context = {}) {
    const flag = await this.getFlag(flagName);
    if (!flag) return false;
    if (!flag.enabled) return false;
    if (flag.rollout_percentage >= 100) return true;

    if (!context.userId) return false;

    return this.isEnabledForUser(
      context.userId,
      flag.rollout_percentage
    );
  }
}

module.exports = FlagService;
