# Doppler GitHub Secrets Setup Guide

This document guides you through setting up the Doppler sync automation with GitHub Actions.

## What is the Doppler Sync?

The repository now includes an automated system that:
- **Pulls secrets from Doppler** - Fetches all environment variables from your Doppler project
- **Syncs to .env** - Updates your local .env file with the latest values
- **Runs on schedule** - Automatically syncs every 6 hours via GitHub Actions
- **Creates backups** - Always backs up the current .env before syncing
- **Tracks changes** - Shows detailed logs of what was added, updated, or removed

## Prerequisites

- Access to your Doppler workspace
- Admin access to your GitHub repository
- Doppler token with read permissions for your secrets

## Step 1: Get Your Doppler Token

### From Doppler Dashboard:
1. Go to https://dashboard.doppler.com
2. Click on **Settings** → **Access Tokens** (or **Personal Tokens**)
3. Create a new **Read-Only** token (recommended for security)
4. Copy the token (you'll only see it once)

## Step 2: Add DOPPLER_TOKEN to GitHub Secrets

### Via GitHub Web Interface:
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Name: `DOPPLER_TOKEN`
5. Value: Paste your Doppler token
6. Click **Add secret**

### Via GitHub CLI:
```bash
gh secret set DOPPLER_TOKEN --body "$(pbpaste)"  # macOS
gh secret set DOPPLER_TOKEN --body "$(xclip -selection clipboard -o)"  # Linux
```

## Step 3: Verify the Setup

### Test Locally:
```bash
doppler run npm run sync:doppler
```

You should see:
```
🔄 Syncing Doppler secrets to .env...
📥 Fetching secrets from Doppler...
   Found X secrets
```

### Manual GitHub Actions Trigger:
1. Go to your GitHub repository
2. Click **Actions** tab
3. Select **Sync Repository from Doppler** workflow
4. Click **Run workflow**
5. Click the running workflow to view logs

## Step 4: Monitor Automated Syncs

The workflow runs automatically:
- **Schedule**: Every 6 hours (0 */6 * * * UTC)
- **Manual trigger**: Available in GitHub Actions tab anytime
- **Push trigger**: Runs when you push to main branch

### View Sync History:
1. Go to **Actions** tab
2. Select **Sync Repository from Doppler**
3. Click any workflow run to see details and logs

## What Gets Synced?

The following environment variables are synced from Doppler:
- Database credentials (DATABASE_URL, Neon)
- Authentication keys (Clerk public/secret keys)
- API keys (Gemini, Resend)
- AWS S3 credentials
- Doppler metadata (config, environment, project)

**Note**: The `.env` file is git-ignored and never committed to the repository.

## Important Security Notes

⚠️ **Do Not:**
- Commit `.env` file to the repository
- Share Doppler tokens in messages or code
- Use a personal Doppler token in CI/CD (create a dedicated read-only token)

✅ **Do:**
- Rotate tokens periodically
- Use read-only tokens for CI/CD
- Monitor GitHub Actions logs for failed syncs
- Keep `.env` file in `.gitignore`

## Troubleshooting

### "DOPPLER_TOKEN is not set"
- Check that the GitHub Secret was added correctly
- Secret names are case-sensitive

### "Failed to fetch Doppler secrets"
- Verify your Doppler token is valid and has read permissions
- Check that your Doppler project/config is correct in doppler.yaml

### Sync shows no changes
- This is normal - all secrets are in sync
- The .env file matches your current Doppler config

### Sync shows unexpected changes
- Run `npm run sync:doppler` locally to debug
- Check that you're using the correct Doppler config
- Compare with `.env.sync-backup` to see what changed

## Local Testing

### Test the sync script:
```bash
# Make sure you're logged into Doppler
doppler login

# Set up the project/config
doppler setup

# Run the sync
doppler run npm run sync:doppler
```

### Test with a different config:
```bash
doppler run -c stg npm run sync:doppler  # Use staging config
doppler run -c prd npm run sync:doppler  # Use production config
```

## Disabling Automatic Syncs

If you want to stop automated syncs:
1. Go to **Actions** → **Sync Repository from Doppler**
2. Click **⋯** → **Disable workflow**

Or remove the schedule from `.github/workflows/ai-repo-update.yml`:
```yaml
on:
  # schedule:
  #   - cron: '0 */6 * * *'  # Commented out
  workflow_dispatch:
  push:
    branches:
      - main
```

## Advanced: Custom Sync Schedule

Edit `.github/workflows/ai-repo-update.yml` to change the sync frequency:

```yaml
schedule:
  - cron: '0 * * * *'      # Every hour
  - cron: '0 0 * * *'      # Daily at midnight UTC
  - cron: '0 */12 * * *'   # Every 12 hours
```

Cron format: `minute hour day month day-of-week`

## Questions or Issues?

See the sync script for more details:
- **Script**: `scripts/sync-repo-ai.ts`
- **Workflow**: `.github/workflows/ai-repo-update.yml`
- **Package script**: `npm run sync:doppler`
