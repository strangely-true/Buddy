# Deployment Guide for Buddy AI Conference

This application consists of two parts that need to be deployed separately:

## 🎯 Quick Deployment Summary

1. **Frontend**: Already deployed to Netlify at https://curious-cobbler-87bad4.netlify.app
2. **Backend**: Needs to be deployed to a Node.js hosting service (instructions below)
3. **Configuration**: Update the backend URL in the frontend config

## 🚀 Backend Deployment Options

### Option 1: Heroku (Recommended)

1. **Create a Heroku account** at https://heroku.com

2. **Install Heroku CLI** and login:
   ```bash
   heroku login
   ```

3. **Create a new Heroku app**:
   ```bash
   heroku create your-app-name-backend
   ```

4. **Deploy the backend**:
   ```bash
   # Initialize git if not already done
   git init
   git add .
   git commit -m "Initial backend deployment"
   
   # Add Heroku remote
   heroku git:remote -a your-app-name-backend
   
   # Deploy
   git push heroku main
   ```

5. **Your backend will be available at**: `https://your-app-name-backend.herokuapp.com`

### Option 2: Railway

1. Go to https://railway.app and sign up
2. Click "New Project" → "Deploy from GitHub repo"
3. Connect your repository
4. Railway will automatically detect the Node.js app
5. Set the start command to: `node server/index.js`
6. Your backend will be available at the provided Railway URL

### Option 3: Render

1. Go to https://render.com and sign up
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `node server/index.js`
   - **Environment**: Node
5. Your backend will be available at the provided Render URL

### Option 4: Vercel (Serverless)

1. Go to https://vercel.com and sign up
2. Import your project from GitHub
3. Vercel will automatically detect and deploy
4. Your backend will be available at the provided Vercel URL

## 🔧 Frontend Configuration Update

After deploying the backend, update the frontend configuration:

1. **Edit `src/config/api.ts`**:
   ```typescript
   export const API_CONFIG = {
     BASE_URL: isDevelopment 
       ? 'http://localhost:3001' 
       : 'https://your-actual-backend-url.herokuapp.com', // Replace with your backend URL
   };
   ```

2. **Redeploy the frontend**:
   - The frontend will automatically redeploy when you push changes to the repository
   - Or manually trigger a redeploy in the Netlify dashboard

## 🌐 CORS Configuration

The backend is configured to accept requests from:
- `https://curious-cobbler-87bad4.netlify.app` (current frontend)
- `localhost:5173` (development)

If you deploy the frontend to a custom domain, update the CORS configuration in `server/index.js`:

```javascript
const corsOptions = {
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://curious-cobbler-87bad4.netlify.app', 'https://your-custom-domain.com']
    : ['http://localhost:5173', 'http://localhost:3000'],
  // ...
};
```

## 🔑 Environment Variables

The backend doesn't require any environment variables to run, but you can optionally set:

- `NODE_ENV=production` (automatically set by most hosting providers)
- `PORT` (automatically set by hosting providers)

## ✅ Verification

After deployment:

1. **Check backend health**: Visit `https://your-backend-url.herokuapp.com/health`
2. **Test the frontend**: Go to https://curious-cobbler-87bad4.netlify.app
3. **Verify connection**: The app should show "Live" status instead of "Backend disconnected"

## 🚨 Troubleshooting

### Backend Connection Issues
- Ensure the backend URL in `src/config/api.ts` matches your deployed backend
- Check that the backend is running by visiting the `/health` endpoint
- Verify CORS settings include your frontend domain

### WebSocket Issues
- Ensure your hosting provider supports WebSocket connections
- Heroku, Railway, and Render all support WebSockets
- Some serverless platforms may have limitations

### API Key Issues
- API keys are configured in the frontend UI and stored locally
- No backend configuration needed for API keys

## 📁 File Structure

```
├── src/                    # Frontend (deployed to Netlify)
├── server/                # Backend (deploy to Heroku/Railway/Render)
│   ├── index.js          # Main server file
│   └── package.json      # Backend dependencies
├── dist/                 # Built frontend files
├── Procfile              # Heroku deployment config
├── app.json              # Heroku app configuration
└── netlify.toml          # Netlify deployment config
```

## 🎉 Success!

Once both frontend and backend are deployed and configured:

1. ✅ Frontend: https://curious-cobbler-87bad4.netlify.app
2. ✅ Backend: https://your-backend-url.herokuapp.com
3. ✅ Full AI conference functionality with real-time discussions
4. ✅ File upload and processing
5. ✅ Voice synthesis (with ElevenLabs API key)
6. ✅ Customizable AI personalities

Your AI conference platform is now live and ready for users!