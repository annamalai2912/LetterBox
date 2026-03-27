# LetterBox | Deployment Guide

Follow these steps to deploy **LetterBox** to **Vercel** with a production-ready **Google OAuth** configuration.

---

## 🚀 1. Vercel Hosting
LetterBox is a Vite/React application and is optimized for zero-config deployment on Vercel.

### Option A: Vercel CLI
1. Install the Vercel CLI: `npm install -g vercel`.
2. Run `vercel` in the `web-dashboard` directory.
3. Follow the prompts to initialize and deploy.
4. Set your Environment Variable:
   - **Key**: `VITE_GOOGLE_CLIENT_ID`
   - **Value**: `Your_Google_Client_ID`

### Option B: Vercel Dashboard
1. Push your code to GitHub/GitLab.
2. Import the project in the Vercel Dashboard.
3. Add `VITE_GOOGLE_CLIENT_ID` to the **Environment Variables** section.
4. Deploy.

---

## 🔐 2. Google OAuth Configuration (Production)
For production deployment, your Google Cloud Console settings **must** include your Vercel domains.

### Steps:
1. Go to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your project and navigate to **APIs & Services > Credentials**.
3. Edit your **OAuth 2.0 Client ID**.
4. **Authorized JavaScript Origins**:
   - Add your localhost: `http://localhost:5173`.
   - Add your production domain: `https://your-app.vercel.app`.
5. **Authorized Redirect URIs**:
   - Add your localhost: `http://localhost:5173`.
   - Add your production domain: `https://your-app.vercel.app`.
6. Click **Save**.

---

## 🛠️ 3. Troubleshooting

### OAuth 'Error 401: invalid_client'
- Verify that the `VITE_GOOGLE_CLIENT_ID` in your Vercel environment exactly matches the Client ID in Google Cloud Console.
- Ensure you have **saved** your origins and redirect URIs in the Google Console.

### Data Not Persisting
- LetterBox uses `IndexedDB` for local-only storage. Data is saved in the browser's persistent storage for the specific domain (`localhost` or `vercel.app`).
- If you switch browsers or clear site data, your local intelligence history will be reset.

---

## 📦 4. Production Build Check
Always run a local build check before deploying to catch any TypeScript errors:
```bash
npm run build
```
If this passes, your Vercel deployment is highly likely to succeed.
