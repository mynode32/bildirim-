const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.serialize(() => {
  db.run('ALTER TABLE notifications ADD COLUMN productUrl TEXT DEFAULT "";', (err) => {
    if(err) console.log("productUrl:", err.message);
  });
  db.run('ALTER TABLE notifications ADD COLUMN views INTEGER DEFAULT 0;', (err) => {
    if(err) console.log("views:", err.message);
  });
  db.run('ALTER TABLE notifications ADD COLUMN clicks INTEGER DEFAULT 0;', (err) => {
    if(err) console.log("clicks:", err.message);
  });
});
