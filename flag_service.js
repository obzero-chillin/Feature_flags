class flagService {
    constructor(db_type, db, table) {
        this.db_type = ['mongodb' | 'mysql' ];
        this.db = db;
        this.table = table;

    }
    async isEnabled(flagName, context) {
        switch (this.db_type) {
            case 'mongodb':
                db.feature_flags.findOne(
                { name: 'new_ui' },
                { projection: { enabled: 1, rollout_percentage: 1 } }
);

                
            
            ;
            case 'mysql':
                const [rows] = await this.db.query(
                `SELECT enabled, rollout_percentage FROM ${this.table} WHERE name = ?`,
                [flagName]
        );;
        }
        
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