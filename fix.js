const fs = require('fs');
let c = fs.readFileSync('backend/public/widget.js', 'utf8');
c = c.replace(/\\\$/g, '$');
c = c.replace(/\\\`/g, '`');
fs.writeFileSync('backend/public/widget.js', c);
