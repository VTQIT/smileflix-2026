// backend/fix-paths.js

const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database.sqlite');

console.log('🔧 Fixing image paths...\n');

db.serialize(() => {
  // Fix poster paths
  db.run(`UPDATE movies SET poster = REPLACE(poster, 'posters/', '') WHERE poster LIKE '%posters/%'`);
  db.run(`UPDATE movies SET poster = REPLACE(poster, 'backdrops/', '') WHERE poster LIKE '%backdrops/%'`);
  db.run(`UPDATE movies SET poster = REPLACE(poster, 'thumbnails/posters/', 'thumbnails/') WHERE poster LIKE '%thumbnails/posters/%'`);
  db.run(`UPDATE movies SET poster = REPLACE(poster, 'thumbnails/backdrops/', 'thumbnails/') WHERE poster LIKE '%thumbnails/backdrops/%'`);
  
  // Fix backdrop paths
  db.run(`UPDATE movies SET backdrop = REPLACE(backdrop, 'posters/', '') WHERE backdrop LIKE '%posters/%'`);
  db.run(`UPDATE movies SET backdrop = REPLACE(backdrop, 'backdrops/', '') WHERE backdrop LIKE '%backdrops/%'`);
  db.run(`UPDATE movies SET backdrop = REPLACE(backdrop, 'thumbnails/posters/', 'thumbnails/') WHERE backdrop LIKE '%thumbnails/posters/%'`);
  db.run(`UPDATE movies SET backdrop = REPLACE(backdrop, 'thumbnails/backdrops/', 'thumbnails/') WHERE backdrop LIKE '%thumbnails/backdrops/%'`);
  
  // Check results
  db.all("SELECT id, title, poster FROM movies LIMIT 5", (err, rows) => {
    if (err) {
      console.error('Error:', err.message);
    } else {
      console.log('✅ Fixed movies:');
      rows.forEach(row => {
        console.log(`  ${row.id}: ${row.title} → ${row.poster}`);
      });
    }
    db.close();
  });
});