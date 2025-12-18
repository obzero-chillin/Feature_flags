class FlagService {
  constructor(db_type, db, table = 'feature_flags') {
    this.db_type = db_type;
    this.db = db;
    this.table = table;
  }

  async getFlag(flagName) {
    switch (this.db_type) {
      case 'mongodb': {
        return await this.db
          .collection(this.table)
          .findOne(
            { name: flagName },
            { projection: { enabled: 1, rollout_percentage: 1 } }
          );
      }

      case 'mysql': {
        const [rows] = await this.db.query(
          `SELECT enabled, rollout_percentage FROM ${this.table} WHERE name = ?`,
          [flagName]
        );
        return rows[0] ?? null;
      }

      default:
        throw new Error('Unsupported db type');
    }
  }

  async isEnabled(flagName, context) {
    const flag = await this.getFlag(flagName);

    if (!flag) return false;
    if (!flag.enabled) return false;
    if (flag.rollout_percentage >= 100) return true;

    return context.userId % 100 < flag.rollout_percentage;
  }
}
