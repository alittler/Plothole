# Google OAuth Setup for Auth0

If the "Sign in with Google" button on the login page isn't saving authentication state, you need to configure the Google OAuth connection in Auth0.

## Steps to Enable Google OAuth

### 1. In Auth0 Dashboard:
- Go to **Connections** → **Social**
- Find and enable **Google-OAuth2** connection
- Click to edit it

### 2. Configure Google Credentials:
You'll need to provide Google OAuth 2.0 credentials:
- **Client ID** - from Google Cloud Console
- **Client Secret** - from Google Cloud Console

To get these from Google Cloud:
1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create/select a project
3. Go to **APIs & Services** → **Credentials**
4. Create an **OAuth 2.0 Client ID** (type: Web application)
5. Add Authorized JavaScript origins and redirect URIs:
   - `https://www.plothole.click`
   - `https://dev-t0pa1ah6r1n2wc4a.us.auth0.com` (your Auth0 domain)
   - `http://localhost:3000` (for local development)
6. Copy the Client ID and Client Secret

### 3. Add Callback URLs to Auth0:
In Auth0 Dashboard → Applications → Your App Settings:
- **Allowed Callback URLs**: 
  - `https://www.plothole.click`
  - `https://plothole-team-avatar.vercel.app` (or your Vercel preview URL)
  - `http://localhost:3000`

- **Allowed Logout URLs**:
  - `https://www.plothole.click`
  - `http://localhost:3000`

- **Allowed Web Origins**:
  - `https://www.plothole.click`
  - `http://localhost:3000`

### 4. Enable in Connections Tab:
Make sure the **Google-OAuth2** connection is enabled for your application:
- Go to **Applications** → Your App
- Click the **Connections** tab
- Enable **google-oauth2**

## Testing

1. Clear browser cache and cookies
2. Go to `https://www.plothole.click` (or `http://localhost:3000`)
3. Click "Sign in with Google"
4. You should be redirected to Google login
5. After login, you should return to the app and be authenticated
6. Projects and data should save/sync normally

## Troubleshooting

**Error: "Connection does not exist"**
- The google-oauth2 connection isn't enabled for your app
- Check step 4 above

**Error: "Redirect URI mismatch"**
- The callback URL in Google Cloud Console doesn't match Auth0
- Verify URLs in both Google Cloud and Auth0 settings

**Appears logged in but doesn't save data**
- The Auth0 `isAuthenticated` state may not be updating properly
- Check browser console for errors
- Try the standard "Sign In" button (email/password) to verify Auth0 connection works
- If that works, the issue is Google OAuth specific

**Still seeing this after setup?**
- Some changes in Auth0 can take a few minutes to propagate
- Try logging out completely and restarting your browser
- Check that `google-oauth2` connection is truly enabled in connections list
