# Vercel Deployment Guide

## Prerequisites
- Vercel account (sign up at vercel.com)
- GitHub account (recommended)
- Node.js installed locally

## Deployment Steps

### Option 1: Deploy via Vercel CLI
1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy from your project directory:
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub (Recommended)
1. Push your code to GitHub repository
2. Go to vercel.com and click "New Project"
3. Import your GitHub repository
4. Vercel will automatically detect the settings and deploy

## Project Structure for Vercel
```
error-finder/
├── api/
│   └── check.js          # Serverless function
├── src/
│   ├── App.jsx           # React frontend
│   └── index.jsx          # Entry point
├── public/
│   └── vite.svg          # Static assets
├── vercel.json           # Vercel configuration
├── package.json          # Dependencies
└── index.html            # HTML template
```

## What Gets Deployed
- **Frontend**: React app built with Vite
- **Backend**: Serverless functions in `/api` directory
- **API Endpoint**: `/api/check` for syntax error detection

## Environment Variables (Optional)
If you need environment variables, add them in Vercel dashboard:
1. Go to your project settings
2. Add environment variables
3. Redeploy

## Testing After Deployment
1. Visit your deployed URL
2. Test with code samples:
   ```javascript
   console.log('hello world'  // Missing quote
   ```
3. Verify error detection works

## Troubleshooting
- If API calls fail, check the `/api/check` endpoint
- Make sure `vercel.json` is properly configured
- Check Vercel function logs for debugging

## Custom Domain (Optional)
1. Go to project settings in Vercel
2. Add custom domain
3. Update DNS records as instructed
