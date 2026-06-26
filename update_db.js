const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'backend', 'database.sqlite');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    db.run(`UPDATE notifications SET imageUrl = 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=150&q=80&fit=crop' WHERE id = 1`);
    db.run(`UPDATE notifications SET imageUrl = 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=150&q=80&fit=crop' WHERE id = 2`);
    db.run(`UPDATE notifications SET imageUrl = 'https://images.unsplash.com/photo-1593640408182-31c70c8268f5?w=150&q=80&fit=crop' WHERE id = 3`);
});

console.log("Database updated with real placeholder photos.");
