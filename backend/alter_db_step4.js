const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.serialize(() => {
  db.run('ALTER TABLE settings ADD COLUMN soundEnabled BOOLEAN DEFAULT 1;', (err) => {
    if(err) console.log("soundEnabled:", err.message);
  });
});
