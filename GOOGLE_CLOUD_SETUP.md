# ☁️ Deploying to Google Cloud from GitHub (Google Cloud Run)

This guide shows you how to host the game on **Google Cloud Run** using your GitHub repository.

Google Cloud Run is **serverless**, provides a **free HTTPS URL**, scales to zero when not in use (costs \$0 when idle), and automatically builds & deploys new versions every time you push to GitHub.

---

## 🚀 Option A: 1-Click Web Console (Easiest & Recommended)

No command line required on your PC.

### Step 1: Push your project to GitHub
If you haven't already pushed to GitHub:
```bash
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

### Step 2: Connect GitHub to Google Cloud Run
1. Go to the [Google Cloud Run Console](https://console.cloud.google.com/run).
2. Click **[Create Service]**.
3. Choose **"Continuously deploy from a repository"** and click **[SET UP WITH CLOUD BUILD]**.
4. In the sidebar:
   - **Repository Provider**: Select **GitHub**.
   - Authenticate your GitHub account and select your repository.
   - **Branch**: `^main$` (or `^master$`).
   - **Build Type**: Select **Dockerfile** (the repository includes a ready-to-use production `Dockerfile`).
5. Under **Service settings**:
   - **Service name**: `tug-of-war` (or your choice).
   - **Region**: Choose a region near you (e.g., `us-central1`, `asia-south1`, etc.).
   - **Authentication**: Select **"Allow unauthenticated invocations"** (so viewers can access the game arena).
   - **Container port**: `8080`.
   - **Memory**: `512 MiB` (or `1 GiB`).
6. Click **[Create]**.

Google Cloud will automatically build the container and provide you with a live HTTPS URL:
`https://tug-of-war-xxxxxx.a.run.app/game/`

---

## ⚡ Option B: Command Line (Google Cloud Shell / `gcloud`)

If you have the `gcloud` CLI installed or open **Google Cloud Shell**:

```bash
# 1. Set your GCP project
gcloud config set project YOUR_PROJECT_ID

# 2. Deploy directly from source (builds & deploys in 1 step)
gcloud run deploy tug-of-war \
  --source . \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --set-env-vars YOUTUBE_API_KEY=AIzaSyDXaLD3JTFkMIOAW8GbhJoP8Fxpnr0HID0
```

---

## 🤖 Option C: Automated CI/CD with GitHub Actions

The repository includes a ready-to-use GitHub Actions workflow at [`.github/workflows/google-cloud-run.yml`](.github/workflows/google-cloud-run.yml).

To enable it:
1. In your GitHub repository, go to **Settings** $\rightarrow$ **Secrets and variables** $\rightarrow$ **Actions**.
2. Add the following repository secrets:
   - `GCP_PROJECT_ID`: Your Google Cloud Project ID.
   - `GCP_SA_KEY`: Service Account JSON key with `Cloud Run Admin` and `Storage Admin` roles.
3. Every time you push to `main` or `master`, GitHub Actions will build and deploy the latest revision to Cloud Run automatically.

---

## 🎮 Verifying Your Live Deployment

Once deployed, visit your Cloud Run service URL:
- **Game Arena**: `https://<YOUR-SERVICE-URL>/game/`
- **Spectator Hub**: `https://<YOUR-SERVICE-URL>/`
- **Admin Settings**: `https://<YOUR-SERVICE-URL>/admin/`
- **Chat Polling API**: `https://<YOUR-SERVICE-URL>/api/chat.php?poll=1`
