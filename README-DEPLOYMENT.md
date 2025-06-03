# TrendoTalk Deployment Guide for Render

## Prerequisites

1. A PostgreSQL database (Render PostgreSQL or external provider like Neon, Supabase)
2. Cloudinary account for media storage
3. Render account

## Environment Variables Required

Set these in your Render service settings:

```
DATABASE_URL=your_postgresql_connection_string
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret
NODE_ENV=production
```

## Deployment Steps

### Option 1: Using render.yaml (Recommended)

1. Connect your GitHub repository to Render
2. The `render.yaml` file will automatically:
   - Create a PostgreSQL database
   - Set up the web service
   - Run database migrations
   - Build and deploy the application

### Option 2: Manual Setup

1. **Create PostgreSQL Database**
   - Go to Render Dashboard
   - Create new PostgreSQL database
   - Note the connection string

2. **Create Web Service**
   - Connect your GitHub repository
   - Set build command: `npm install && node migrate.js && npm run build`
   - Set start command: `npm start`
   - Add environment variables listed above

3. **Deploy**
   - Render will automatically build and deploy
   - Database tables will be created during first deployment

## Database Migration

The `migrate.js` script automatically:
- Creates all required tables
- Sets up indexes for performance
- Creates the admin user (username: ipj.trendotalk)
- Ensures data persistence across deployments

## Admin Login Credentials

- Username: `ipj.trendotalk`
- Password: `IpjDr620911@TrendoTalk`

## Data Persistence

Your data will be preserved because:
- Tables use `CREATE TABLE IF NOT EXISTS`
- No data is deleted during migrations
- Only schema updates are applied
- Existing data remains intact

## Post-Deployment

1. Test admin login
2. Create regular user accounts
3. Upload test content
4. Verify all features work correctly

## Troubleshooting

If you encounter database connection issues:
1. Verify DATABASE_URL environment variable
2. Check PostgreSQL database is running
3. Ensure database allows external connections
4. Run `node migrate.js` manually if needed

## Features Included

- User authentication and profiles
- Post creation with media upload
- Circle's Vibe (24-hour stories)
- Real-time messaging
- Friend requests and following
- Search functionality
- Admin panel access