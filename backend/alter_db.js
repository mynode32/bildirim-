const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('database.sqlite');
db.serialize(() => {
  db.run('ALTER TABLE settings ADD COLUMN hideOnMobile BOOLEAN DEFAULT 0;', (err) => {
    if(err) console.log(err.message);
  });
  db.run("ALTER TABLE settings ADD COLUMN hideOnUrls TEXT DEFAULT 'checkout,cart';", (err) => {
    if(err) console.log(err.message);
  });
});
