# Deployment Guide: Book Notes Application to Render.com

This guide will walk you through deploying your Book Notes application to Render.com with PostgreSQL database.

## Prerequisites
- A Render.com account
- Git repository with your Book Notes application code

## Step 1: Prepare Your Application

Your application has been updated with the necessary configurations for production:
- ✅ Added `connect-pg-simple` for production session storage
- ✅ Updated database connection with SSL for production
- ✅ Created `render.yaml` deployment configuration
- ✅ Created database initialization script

## Step 2: Deploy to Render.com

### Option A: Using Render Dashboard (Recommended)
1. Go to [Render.com](https://render.com) and log in
2. Click "New +" and select "Blueprint"
3. Connect your Git repository (GitHub, GitLab, etc.)
4. Render will automatically detect the `render.yaml` file
5. Review the configuration and click "Apply"

### Option B: Using Render CLI
1. Install Render CLI: `npm install -g @renderinc/cli`
2. Login: `render login`
3. Deploy: `render deploy`

## Step 3: Configure Environment Variables

After deployment, configure these environment variables in the Render dashboard:

### Required Variables:
- `SECRET_KEY`: Generate a strong random string for session encryption
  - You can generate one using: `openssl rand -hex 32`

### Optional Variables (for Google OAuth):
- `GOOGLE_CLIENT_ID`: Your Google OAuth client ID
- `GOOGLE_CLIENT_SECRET`: Your Google OAuth client secret
- `CALLBACK_URL`: Your app URL + `/auth/google/add` (e.g., `https://your-app.onrender.com/auth/google/add`)

### Automatic Variables:
- `DATABASE_URL`: Automatically provided by Render
- `NODE_ENV`: Automatically set to "production"

## Step 4: Database Setup

The database will be automatically created and initialized with:
- `users` table for user authentication
- `items` table for book reviews
- Proper indexes for performance

## Step 5: Verify Deployment

1. Visit your app URL (e.g., `https://your-app.onrender.com`)
2. Test basic functionality:
   - User registration/signup
   - Adding book reviews
   - Searching and sorting books

## Troubleshooting Common Issues

### Database Connection Errors
- Ensure `DATABASE_URL` is correctly set by Render
- Check that SSL is enabled in database connection

### Session Store Warnings
- The app now uses `connect-pg-simple` instead of MemoryStore
- Sessions are stored in PostgreSQL for production

### File Uploads
- File uploads work locally but may need additional configuration for production
- Consider using cloud storage (S3, Cloudinary) for production file storage

## Post-Deployment Considerations

1. **Backups**: Enable automatic backups for your PostgreSQL database in Render
2. **Monitoring**: Set up monitoring and alerts for your application
3. **Scaling**: Upgrade from free tier if you need more resources
4. **Custom Domain**: Configure a custom domain if needed

## Local Development

For local development:
1. Copy `.env.example` to `.env`
2. Fill in your local database credentials
3. Run `npm install`
4. Run `npm start`

## Support

If you encounter issues:
1. Check Render dashboard logs
2. Verify environment variables are set correctly
3. Ensure database tables were created properly

Your application is now ready for production deployment on Render.com!
