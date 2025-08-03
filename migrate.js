import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set");
}

async function runMigrations() {
  console.log('Starting database migration...');
  console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });

  try {
    // Test database connection first
    await pool.query('SELECT 1');
    console.log('Database connection successful');
    // Create tables manually
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(255) UNIQUE NOT NULL,
        display_name TEXT,
        password VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT false,
        avatar TEXT,
        bio TEXT,
        website TEXT,
        links TEXT,
        followers_count INTEGER DEFAULT 0,
        following_count INTEGER DEFAULT 0,
        total_posts_created INTEGER DEFAULT 0,
        account_status TEXT DEFAULT 'live',
        account_status_reason TEXT,
        account_status_expires TIMESTAMP,
        mobile TEXT,
        email TEXT,
        mobile_verified BOOLEAN DEFAULT false,
        email_verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    console.log('Users table created/verified');

    // Add missing columns to existing users table
    try {
      const columns = [
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS display_name TEXT',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS links TEXT',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS followers_count INTEGER DEFAULT 0',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS following_count INTEGER DEFAULT 0',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS total_posts_created INTEGER DEFAULT 0',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT \'live\'',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status_reason TEXT',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS account_status_expires TIMESTAMP',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile TEXT',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS mobile_verified BOOLEAN DEFAULT false',
        'ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false'
      ];
      
      for (const sql of columns) {
        await pool.query(sql);
        console.log('Added column:', sql.split('ADD COLUMN IF NOT EXISTS ')[1]?.split(' ')[0]);
      }
      console.log('Successfully added missing columns to users table');
    } catch (error) {
      console.error('Error adding columns to users table:', error.message);
      throw error;
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS posts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title TEXT,
        video1_url TEXT,
        video2_url TEXT,
        video3_url TEXT,
        rank INTEGER,
        other_rank TEXT,
        category TEXT,
        type TEXT,
        details_link TEXT,
        caption TEXT,
        image_url TEXT,
        video_url TEXT,
        link TEXT,
        likes_count INTEGER DEFAULT 0,
        dislikes_count INTEGER DEFAULT 0,
        votes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        is_admin_post BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing columns to existing posts table
    try {
      await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS title TEXT;`);
      await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS video1_url TEXT;`);
      await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS video2_url TEXT;`);
      await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS video3_url TEXT;`);
      await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS rank INTEGER;`);
      await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS other_rank TEXT;`);
      await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS category TEXT;`);
      await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS type TEXT;`);
      await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS details_link TEXT;`);
      await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS link TEXT;`);
      await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS dislikes_count INTEGER DEFAULT 0;`);
      await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS votes_count INTEGER DEFAULT 0;`);
      await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;`);
      await pool.query(`ALTER TABLE posts ADD COLUMN IF NOT EXISTS is_admin_post BOOLEAN DEFAULT false;`);
      console.log('Successfully added missing columns to posts table');
    } catch (error) {
      console.log('Some posts columns may already exist:', error.message);
    }

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
        type TEXT DEFAULT 'like',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Add missing column to existing likes table
    try {
      await pool.query(`ALTER TABLE likes ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'like';`);
      await pool.query(`ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_post_id_user_id_key;`);
      console.log('Successfully updated likes table');
    } catch (error) {
      console.log('Likes table updates may already exist:', error.message);
    }

    await pool.query(`
      CREATE TABLE IF NOT EXISTS stories (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        image_url TEXT,
        video_url TEXT,
        title TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS vibes (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        image_url TEXT,
        video_url TEXT,
        title TEXT,
        content TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dislikes (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS votes (
        id SERIAL PRIMARY KEY,
        post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

    await pool.query(`
      CREATE TABLE IF NOT EXISTS cvs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE UNIQUE,
        data TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        reporter_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reported_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reported_username TEXT NOT NULL,
        reason TEXT NOT NULL,
        message TEXT,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS circle_messages (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        image_url TEXT,
        video_url TEXT,
        likes_count INTEGER DEFAULT 0,
        comments_count INTEGER DEFAULT 0,
        is_public BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS circle_message_comments (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL REFERENCES circle_messages(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS circle_message_likes (
        id SERIAL PRIMARY KEY,
        message_id INTEGER NOT NULL REFERENCES circle_messages(id) ON DELETE CASCADE,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dm_chats (
        id SERIAL PRIMARY KEY,
        user1_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user2_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        user1_last_read TIMESTAMP,
        user2_last_read TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dm_messages (
        id SERIAL PRIMARY KEY,
        chat_id INTEGER NOT NULL REFERENCES dm_chats(id) ON DELETE CASCADE,
        sender_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        content TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        file_url TEXT,
        is_read BOOLEAN DEFAULT false,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dm_requests (
        id SERIAL PRIMARY KEY,
        from_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        to_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        first_message TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS dm_blocks (
        id SERIAL PRIMARY KEY,
        blocker_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        blocked_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        block_type TEXT DEFAULT 'permanent',
        expires_at TIMESTAMP,
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
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_vibes_user_id ON vibes(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_vibes_expires_at ON vibes(expires_at);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON follows(follower_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_follows_following_id ON follows(following_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dm_messages_chat_id ON dm_messages(chat_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dm_chats_user1_id ON dm_chats(user1_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_dm_chats_user2_id ON dm_chats(user2_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_circle_messages_user_id ON circle_messages(user_id);`);

    // Verify critical columns exist
    console.log('Verifying critical columns...');
    const result = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users' 
      AND column_name IN ('display_name', 'username', 'password')
      ORDER BY column_name;
    `);
    
    const foundColumns = result.rows.map(row => row.column_name);
    console.log('Found critical columns:', foundColumns);
    
    const requiredColumns = ['display_name', 'password', 'username'];
    const missingColumns = requiredColumns.filter(col => !foundColumns.includes(col));
    
    if (missingColumns.length > 0) {
      throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
    }
    
    console.log('✅ Database migration completed successfully!');
    console.log('✅ All required columns verified');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

runMigrations()
  .then(() => {
    console.log('✅ Migration script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Migration script failed:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  });