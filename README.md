# LetterBox | Intelligence Command Center

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2F%5BUSER_GITHUB_URL_HERE%5D&env=VITE_GOOGLE_CLIENT_ID)

**LetterBox** is a high-fidelity, intelligence-driven information command center designed for modern knowledge workers. It transforms your cluttered newsletter subscriptions into a high-precision, distraction-free intelligence flow.

![LetterBox Intelligence Dashboard](https://github.com/letterbox/branding/blob/main/hero.png?raw=true)

## 📡 Core Intelligence Suite

LetterBox is built on the philosophy of **Maximum Information Density, Zero Friction.**

### 📈 Intelligence Pulse (Heatmap)
Visual heatmap tracking your transmission frequency over the last 7 days. Understand your information load at a glance.

### 🧹 Smart Purge (Node Decommissioning)
Automatically identifies high-frequency, low-engagement "Dead Nodes." Batch-archive content from underperforming senders with a single command.

### 🛰️ Discovery Engine
Proactive recommendations for premium intelligence sources (newsletters) tailored to your existing high-signal categories.

### 🛠️ Intelligence Workbench
Integrated drafting and insight extraction tool. Automatically summarizes transmissions and extracts key links into a persistent workbench.

### 👁️ ZEN & GHOST Modes
- **ZEN**: Immersive, distraction-free reading experience.
- **GHOST**: Privacy-first transmission access that suppresses read-receipts.

---

## 🛡️ Privacy & Security
- **Local-First Architecture**: Your data is stored locally in `IndexedDB`. No intermediate servers, no data harvesting.
- **Direct Integration**: Secure, direct OAuth 2.0 communication with the Gmail API.
- **Privacy-First**: No external tracking, no third-party analytics.

---

## 🛠️ Tech Stack
- **Framework**: [React](https://reactjs.org/) + [Vite](https://vitejs.dev/)
- **State & Logic**: TypeScript, [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Database**: [idb](https://github.com/jakearchibald/idb) (IndexedDB Wrapper)
- **Authentication**: [@react-oauth/google](https://www.npmjs.com/package/@react-oauth/google)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- Google Cloud Console Project (with Gmail API enabled)

### Installation
1. Clone the repository.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file and add your Google Client ID:
   ```env
   VITE_GOOGLE_CLIENT_ID=your_client_id_here
   ```
4. Start the development server:
   ```bash
   npm run dev
   ```

## 🌐 Deployment
For detailed deployment instructions for **Vercel** and **Google OAuth**, see [DEPLOYMENT.md](./DEPLOYMENT.md).

---

## 📜 License
MIT License. Built for the intelligence era.
