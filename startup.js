const { Pool } = require('@neondatabase/serverless');
const ws = require("ws");

// Set up WebSocket constructor for Neon
const neonConfig = require('@neondatabase/serverless').neonConfig;
neonConfig.webSocketConstructor = ws;

async function initializeDatabase() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL environment variable is required');
    process.exit(1);
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  
  try {
    console.log('Initializing database tables...');
    
    // Create users table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        name VARCHAR(255),
        bio TEXT,
        website VARCHAR(255),
        phone VARCHAR(255),
        email VARCHAR(255),
        avatar VARCHAR(255),
        is_admin BOOLEAN DEFAULT false,
        followers_count INTEGER DEFAULT 0,
        following_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create posts table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        caption TEXT,
        image_url VARCHAR(255),
        video_url VARCHAR(255),
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create comments table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create likes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id)
      );
    `);

    // Create stories table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS stories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        image_url VARCHAR(255),
        video_url VARCHAR(255),
        caption TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      );
    `);

    // Create follows table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
      );
    `);

    // Create friend_requests table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS friend_requests (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        status VARCHAR(20) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(from_user_id, to_user_id)
      );
    `);

    // Create chats table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user1_id, user2_id)
      );
    `);

    // Create messages table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create notifications table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(20) NOT NULL,
        message TEXT NOT NULL,
        from_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing columns to existing tables
    try {
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0;`);
      await pool.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0;`);
    } catch (error) {
      console.log('Columns already exist or error adding columns:', error.message);
    }

    // Create indexes for performance
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_stories_expires_at ON stories(expires_at);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);`);

    console.log('Database tables and indexes created successfully');

    // Create admin user if not exists
    const bcrypt = require('bcryptjs');
    const adminPassword = await bcrypt.hash('IpjDr620911@TrendoTalk', 10);
    
    await pool.query(`
      INSERT INTO users (username, password, name, bio, is_admin)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (username) DO NOTHING;
    `, ['ipj.trendotalk', adminPassword, 'TrendoTalk Admin', 'Official TrendoTalk Administrator', true]);

    console.log('Admin user created/verified successfully');
    
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

initializeDatabase();