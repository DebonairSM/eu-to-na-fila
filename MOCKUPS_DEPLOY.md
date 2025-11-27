# Deploying Mockups as Static Site on Render

## Option 1: Using Blueprint (render-mockups.yaml)

1. In Render dashboard, go to **New > Blueprint**
2. Connect your GitHub repository
3. Select or create the `render-mockups.yaml` file
4. Render will automatically detect it and create a static site
5. Review and click **Apply**

## Option 2: Manual Configuration

1. In Render dashboard, go to **New > Static Site**
2. Connect your GitHub repository
3. Configure:
   - **Name**: `eutonafila-mockups`
   - **Branch**: `main`
   - **Root Directory**: (leave empty)
   - **Build Command**: `echo "No build needed"`
   - **Publish Directory**: `mockups`
4. Click **Create Static Site**

## Access Your Mockups

Once deployed, your mockups will be available at:
- **Home**: `https://your-app.onrender.com/index.html`
- **Queue Manager**: `https://your-app.onrender.com/barber-queue-manager.html`
- **Customer Status**: `https://your-app.onrender.com/customer-status.html`
- **Queue Join**: `https://your-app.onrender.com/queue-join.html`
- **Owner Dashboard**: `https://your-app.onrender.com/owner-dashboard.html`
- **Login Modal**: `https://your-app.onrender.com/login-modal.html`

## Notes

- All HTML files are self-contained with inline CSS and JavaScript
- No build process needed - just serve the files as-is
- The `mockups` directory will be the root of your static site
- You can set a custom domain if desired

