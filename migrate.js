const { Pool, neonConfig } = require('@neondatabase/serverless');
const { drizzle } = require('drizzle-orm/neon-serverless');
const ws = require("ws");

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

async function runMigrations() {
  console.log('Starting database migration...');
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  try {
    // Create tables manually
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
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(post_id, user_id)
      );
    `);

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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS follows (
        id SERIAL PRIMARY KEY,
        follower_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        following_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(follower_id, following_id)
      );
    `);

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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS chats (
        id SERIAL PRIMARY KEY,
        user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user1_id, user2_id)
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Check if admin user exists
    const adminCheck = await pool.query(`
      SELECT COUNT(*) as count FROM users WHERE username = 'ipj.trendotalk';
    `);

    if (adminCheck.rows[0].count === '0') {
      await pool.query(`
        INSERT INTO users (username, password, name, is_admin, created_at)
        VALUES ('ipj.trendotalk', '$2b$10$gcLJ0JaGGkD7Rpo2wgJ3OOXsDXMxy7BxuHjX.MJdFweAIcoeBKB8K', 'Admin User', true, CURRENT_TIMESTAMP);
      `);
      console.log('Admin user created');
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
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);`);

    console.log('Database migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigrations().catch((error) => {
  console.error('Migration script failed:', error);
  process.exit(1);
});