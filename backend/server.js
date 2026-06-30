// backend/server.js

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Middleware
app.use(cors({
  origin: '*',
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));

// Serve media files from public/media
const mediaPath = path.join(__dirname, '../public/media');
if (fs.existsSync(mediaPath)) {
  app.use('/media', express.static(mediaPath));
  console.log(`📁 Serving media from: ${mediaPath}`);
} else {
  console.warn(`⚠️ Media folder not found: ${mediaPath}`);
}

// Database
const db = new sqlite3.Database('./database.sqlite');

// Create tables
db.serialize(() => {
  // Movies table
  db.run(`
    CREATE TABLE IF NOT EXISTS movies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      description TEXT,
      poster TEXT,
      backdrop TEXT,
      video TEXT,
      duration INTEGER,
      category_id TEXT,
      published INTEGER DEFAULT 1,
      ads TEXT,
      created_at TEXT,
      year INTEGER,
      rating REAL,
      featured INTEGER DEFAULT 0,
      badge TEXT,
      weekly_trending_rank INTEGER,
      genres TEXT,
      cast_list TEXT,
      director TEXT,
      country TEXT,
      language TEXT,
      content_rating TEXT,
      play_count INTEGER DEFAULT 0,
      last_played TEXT
    )
  `);

  // Categories table
  db.run(`
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      display_order INTEGER DEFAULT 0,
      virtual INTEGER DEFAULT 0,
      icon TEXT
    )
  `);

  // Users table
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT DEFAULT 'viewer',
      created_at TEXT
    )
  `);

  // Insert default categories if empty
  db.get("SELECT COUNT(*) as count FROM categories", (err, row) => {
    if (err) {
      console.error('Error checking categories:', err);
      return;
    }
    if (row.count === 0) {
      const defaultCategories = [
        ['1', 'Trending', 'trending', 0, 0, null],
        ['2', 'Action', 'action', 1, 0, null],
        ['3', 'Comedy', 'comedy', 2, 0, null],
        ['4', 'Drama', 'drama', 3, 0, null],
        ['5', 'Sci-Fi', 'sci-fi', 4, 0, null],
        ['6', 'Horror', 'horror', 5, 0, null],
        ['7', 'Animation', 'animation', 6, 0, null],
        ['8', 'Romance', 'romance', 7, 0, null]
      ];
      const stmt = db.prepare("INSERT INTO categories (id, name, slug, display_order, virtual, icon) VALUES (?, ?, ?, ?, ?, ?)");
      defaultCategories.forEach(c => stmt.run(c));
      stmt.finalize();
      console.log('✅ Default categories created');
    }
  });

  // Insert default user if empty
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (err) {
      console.error('Error checking users:', err);
      return;
    }
    if (row.count === 0) {
      db.run(
        "INSERT INTO users (id, email, password, role, created_at) VALUES (?, ?, ?, ?, ?)",
        ['1', 'admin@smileflex.com', 'admin123', 'admin', new Date().toISOString()],
        (err) => {
          if (err) console.error('Error creating default user:', err);
          else console.log('✅ Default user created');
        }
      );
    }
  });

  console.log('✅ Database initialized');
});

// ============ MOVIE ROUTES ============

// Get all movies
app.get('/api/movies', (req, res) => {
  db.all("SELECT * FROM movies ORDER BY created_at DESC", (err, rows) => {
    if (err) {
      console.error('Error fetching movies:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    const movies = rows.map(row => ({
      id: row.id,
      title: row.title,
      slug: row.slug,
      description: row.description || '',
      poster: row.poster || '',
      backdrop: row.backdrop || '',
      video: row.video || '',
      duration: row.duration || 0,
      categoryId: row.category_id || '',
      published: row.published === 1,
      ads: row.ads ? JSON.parse(row.ads) : [],
      createdAt: row.created_at || new Date().toISOString(),
      year: row.year || new Date().getFullYear(),
      rating: row.rating || 0,
      featured: row.featured === 1,
      badge: row.badge || '',
      weeklyTrendingRank: row.weekly_trending_rank || undefined,
      genres: row.genres ? JSON.parse(row.genres) : [],
      cast_list: row.cast_list ? JSON.parse(row.cast_list) : [],
      director: row.director || '',
      country: row.country || '',
      language: row.language || '',
      content_rating: row.content_rating || '',
      playCount: row.play_count || 0,
      lastPlayed: row.last_played || null
    }));
    res.json(movies);
  });
});

// Get single movie
app.get('/api/movies/:id', (req, res) => {
  db.get("SELECT * FROM movies WHERE id = ?", [req.params.id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'Movie not found' });
      return;
    }
    res.json(row);
  });
});

// Create/Update movie
app.post('/api/movies', (req, res) => {
  const movie = req.body;
  
  db.run(`
    INSERT OR REPLACE INTO movies (
      id, title, slug, description, poster, backdrop, video,
      duration, category_id, published, ads, created_at,
      year, rating, featured, badge, weekly_trending_rank,
      genres, cast_list, director, country, language, content_rating
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    movie.id,
    movie.title,
    movie.slug,
    movie.description || '',
    movie.poster || '',
    movie.backdrop || '',
    movie.video || '',
    movie.duration || 0,
    movie.categoryId || '',
    movie.published ? 1 : 0,
    JSON.stringify(movie.ads || []),
    movie.createdAt || new Date().toISOString(),
    movie.year || new Date().getFullYear(),
    movie.rating || 0,
    movie.featured ? 1 : 0,
    movie.badge || '',
    movie.weeklyTrendingRank || null,
    JSON.stringify(movie.genres || []),
    JSON.stringify(movie.cast_list || []),
    movie.director || '',
    movie.country || '',
    movie.language || '',
    movie.content_rating || ''
  ], function(err) {
    if (err) {
      console.error('Error saving movie:', err);
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true, id: movie.id });
  });
});

// Delete movie
app.delete('/api/movies/:id', (req, res) => {
  db.run("DELETE FROM movies WHERE id = ?", [req.params.id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json({ success: true, deleted: this.changes });
  });
});

// Increment play count
app.post('/api/movies/:id/play', (req, res) => {
  const now = new Date().toISOString();
  db.run(
    "UPDATE movies SET play_count = play_count + 1, last_played = ? WHERE id = ?",
    [now, req.params.id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ success: true, playCount: this.changes });
    }
  );
});

// ============ CATEGORY ROUTES ============

// Get all categories
app.get('/api/categories', (req, res) => {
  db.all("SELECT * FROM categories ORDER BY display_order", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    const categories = rows.map(row => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      order: row.display_order,
      virtual: row.virtual === 1,
      icon: row.icon || undefined
    }));
    res.json(categories);
  });
});

// Update categories (replace all)
app.post('/api/categories', (req, res) => {
  const categories = req.body;
  
  db.run("DELETE FROM categories", (err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    
    const stmt = db.prepare(
      "INSERT INTO categories (id, name, slug, display_order, virtual, icon) VALUES (?, ?, ?, ?, ?, ?)"
    );
    
    let completed = 0;
    categories.forEach(c => {
      stmt.run(c.id, c.name, c.slug, c.order || 0, c.virtual ? 1 : 0, c.icon || null, (err) => {
        if (err) console.error('Error inserting category:', err);
        completed++;
        if (completed === categories.length) {
          stmt.finalize();
          res.json({ success: true });
        }
      });
    });
    
    if (categories.length === 0) {
      stmt.finalize();
      res.json({ success: true });
    }
  });
});

// ============ USER ROUTES ============

// Get all users
app.get('/api/users', (req, res) => {
  db.all("SELECT id, email, role, created_at FROM users", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// Get current user
app.get('/api/users/current', (req, res) => {
  db.get("SELECT id, email, role FROM users WHERE role = 'admin' LIMIT 1", (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    res.json(row);
  });
});

// Login
app.post('/api/users/login', (req, res) => {
  const { email, password } = req.body;
  db.get(
    "SELECT id, email, role FROM users WHERE email = ? AND password = ?",
    [email, password],
    (err, row) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (!row) {
        res.status(401).json({ error: 'Invalid credentials' });
        return;
      }
      res.json(row);
    }
  );
});

// Create user
app.post('/api/users', (req, res) => {
  const { email, password, role } = req.body;
  
  db.get("SELECT email FROM users WHERE email = ?", [email], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (row) {
      res.status(400).json({ error: 'User already exists' });
      return;
    }
    
    const id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    const createdAt = new Date().toISOString();
    
    db.run(
      "INSERT INTO users (id, email, password, role, created_at) VALUES (?, ?, ?, ?, ?)",
      [id, email, password, role || 'viewer', createdAt],
      function(err) {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.json({ 
          success: true, 
          user: { id, email, role: role || 'viewer', createdAt }
        });
      }
    );
  });
});

// ============ HEALTH CHECK ============

app.get('/api/health', (req, res) => {
  db.get("SELECT COUNT(*) as count FROM movies", (err, row) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: 'sqlite',
      movies: row ? row.count : 0
    });
  });
});

// ============ ROOT ============

app.get('/', (req, res) => {
  res.json({
    name: 'SmileFlex API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      movies: {
        list: 'GET /api/movies',
        get: 'GET /api/movies/:id',
        create: 'POST /api/movies',
        delete: 'DELETE /api/movies/:id',
        play: 'POST /api/movies/:id/play'
      },
      categories: {
        list: 'GET /api/categories',
        update: 'POST /api/categories'
      },
      users: {
        list: 'GET /api/users',
        current: 'GET /api/users/current',
        login: 'POST /api/users/login',
        create: 'POST /api/users'
      },
      health: 'GET /api/health'
    }
  });
});

// ============ START SERVER ============

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n${'='.repeat(50)}`);
  console.log(`🚀 SmileFlex API Server`);
  console.log(`${'='.repeat(50)}`);
  console.log(`📍 URL: http://localhost:${PORT}`);
  console.log(`📁 Database: ${path.join(__dirname, 'database.sqlite')}`);
  console.log(`📁 Media: ${mediaPath}`);
  console.log(`\n📋 Endpoints:`);
  console.log(`   GET  /api/movies        - List all movies`);
  console.log(`   GET  /media/*           - Serve media files`);
  console.log(`   POST /api/movies        - Create/Update movie`);
  console.log(`   GET  /api/movies/:id    - Get single movie`);
  console.log(`   DELETE /api/movies/:id  - Delete movie`);
  console.log(`   POST /api/movies/:id/play - Increment play count`);
  console.log(`   GET  /api/categories    - List categories`);
  console.log(`   POST /api/categories    - Update categories`);
  console.log(`   POST /api/users/login   - Login`);
  console.log(`   GET  /api/users/current - Get current user`);
  console.log(`\n🔑 Default login: admin@smileflex.com / admin123`);
  console.log(`${'='.repeat(50)}\n`);
});