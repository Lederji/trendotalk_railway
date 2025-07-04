# TrendoTalk - Social Media Web Application

## Overview

TrendoTalk is a modern social media web application built for high-scale usage (10,000+ active users). It combines features from Instagram, TikTok, and messaging platforms, providing users with content creation, social interaction, and real-time communication capabilities.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state, React hooks for local state
- **UI Components**: Radix UI components with Tailwind CSS for styling
- **Build Tool**: Vite for development and production builds

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript compiled to ES modules
- **Database ORM**: Drizzle ORM for type-safe database operations
- **Session Management**: In-memory sessions with bearer token authentication
- **File Uploads**: Multer with Cloudinary integration for media storage

### Database Design
- **Primary Database**: PostgreSQL via Neon serverless
- **Schema Management**: Drizzle migrations with manual table creation fallback
- **Key Tables**: users, posts, comments, likes, chats, messages, notifications, reports

## Key Components

### Authentication System
- Username-based authentication with "tp-" prefix requirement
- Password hashing using bcryptjs
- Session-based authentication with bearer tokens
- Admin role separation with elevated permissions

### Content Management
- **Posts**: Support for images, videos, and text content
- **Admin Posts**: Special video posts with ranking and categorization
- **Stories**: Temporary content with expiration
- **Comments**: Nested commenting system with engagement metrics

### Real-time Features
- **Messaging**: Direct messaging with file sharing
- **Notifications**: Real-time notification system
- **Live Updates**: Query polling for real-time data refresh

### Media Handling
- **Upload Strategy**: Memory-based multer uploads to Cloudinary
- **Supported Formats**: Images (JPEG, PNG, GIF), Videos (MP4, MOV, AVI, WebM), Documents (PDF, DOC, TXT)
- **Video Features**: Autoplay with intersection observer, mute/unmute controls

### Admin Panel
- **User Management**: Ban/unban users, verify accounts, user statistics
- **Content Moderation**: Delete posts, manage reports, broadcast notifications
- **Analytics**: User activity logs, content performance metrics

## Data Flow

### User Journey
1. **Registration**: Username validation → Account creation → Session establishment
2. **Content Creation**: File upload → Cloudinary processing → Database storage
3. **Social Interaction**: Like/comment/share → Real-time updates → Notification generation
4. **Messaging**: Message creation → File attachment → Real-time delivery

### Admin Workflow
1. **Content Management**: Admin creates ranked video posts for homepage
2. **User Moderation**: Monitor reports → Take action → Send notifications
3. **Analytics**: View statistics → Generate reports → Make platform decisions

## External Dependencies

### Cloud Services
- **Cloudinary**: Media storage and processing
- **Neon**: PostgreSQL database hosting
- **Render**: Application deployment platform

### Third-party APIs
- **SendGrid**: Email notifications and OTP delivery
- **WebSocket**: Real-time communication support

### Development Tools
- **Replit**: Primary development environment
- **ESBuild**: Production bundle compilation
- **PostCSS**: CSS processing with Tailwind

## Deployment Strategy

### Environment Configuration
- **Development**: Replit with hot reload via Vite
- **Production**: Render with PostgreSQL database
- **Required Environment Variables**:
  - `DATABASE_URL`: PostgreSQL connection string
  - `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`: Media storage
  - `SENDGRID_API_KEY`: Email service (optional, falls back to console logging)

### Build Process
1. **Frontend**: Vite builds React app to `dist/public`
2. **Backend**: ESBuild compiles TypeScript to `dist/index.js`
3. **Database**: Manual migration scripts ensure table creation
4. **Deployment**: Render automatically builds and deploys on git push

### Scaling Considerations
- Session storage currently in-memory (should migrate to Redis for production)
- Database queries optimized with indexes and proper relationships
- Media files handled by Cloudinary CDN for global distribution
- Real-time features use polling (WebSocket upgrade planned)

## Changelog
- June 30, 2025. Initial setup

## User Preferences

Preferred communication style: Simple, everyday language.