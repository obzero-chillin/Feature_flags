class flagService {
    constructor(db) {
        this.db = db;
    }
    async isEnabled(flagName, context) {
        const [rows] = await this.db.query(
            'SELECT enabled, rollout_percentage FROM feature_flags WHERE name = ?',
            [flagName]
        );
        if (rows.length === 0) {
            return false; // Flag not found, default to disbled
        }
        const flag = rows[0];
        if (!flag.enabled) {
            return false; // Flag is disabled
        }
        if (flag.rollout_percentage >= 90) {
            return true; // Fully enabled
        }

        return context.userId % 100 < flag.rollout_percentage;
        
    }
}