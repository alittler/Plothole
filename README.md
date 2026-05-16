<div align="center">
    
# Plothole
### Your Story, Decoded.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Framework: Next.js 15](https://img.shields.io/badge/Framework-Next.js%2015-black.svg)](https://nextjs.org/)
[![Storage: Vercel Blob](https://img.shields.io/badge/Storage-Vercel%20Blob-blue.svg)](https://vercel.com/storage/blob)
[![AI: Gemini](https://img.shields.io/badge/AI-Gemini%20Flash-8E75C2.svg)](https://deepmind.google/technologies/gemini/)

</div>

**Plothole** is an AI-powered narrative architecture tool designed for novelists, world-builders, and screenwriters. It transforms raw manuscripts and research material into a living, interconnected encyclopedia of your narrative universe.

---

## 🚀 Architecture: Serverless & Stateless
Plothole V2 has been refactored for a modern, serverless-first architecture optimized for **Vercel**.

*   **Runtime:** Next.js 15 (App Router)
*   **API Layer:** Stateless Serverless Functions
*   **Persistence:** Vercel Blob (Object Storage) & JSON-based document persistence
*   **Authentication:** Auth0 (OIDC)
*   **Intelligence:** Google Gemini Pro/Flash via Vertex AI / Google AI SDK

---

## 🛠 Tech Stack

*   **Frontend:** React 19, TypeScript, Tailwind CSS 4
*   **State & Routing:** React Router 7, React Flow
*   **Editor:** Tiptap (ProseMirror)
*   **Maps:** Leaflet & OpenStreetMap (Fantasy Map Support)
*   **UI Components:** Lucide Icons, Framer Motion

---

## ⚡️ Quick Start

### Prerequisites
*   [Node.js 20+](https://nodejs.org/)
*   A [Google AI Studio](https://aistudio.google.com/) API Key
*   A [Vercel](https://vercel.com/) account (for Blob storage)

### Installation
1.  **Clone the repository:**
    ```bash
    git clone https://github.com/alittler/Plothole.git
    cd Plothole
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Environment Setup:**
    Create a `.env` file based on `.env.example`.

4.  **Run for development:**
    ```bash
    npm run dev
    ```

---

## 📂 Project Structure

```text
├── app/                # Next.js App Router (API & Pages)
│   ├── api/            # Serverless route handlers
│   └── services/       # Server-side logic (Blob storage, AI extraction)
├── src/                # Frontend application
│   ├── components/     # UI Views (Atlas, Entity Explorer, Notepad)
│   ├── services/       # Client-side state & sync logic
│   └── types.ts        # Unified Type definitions
├── public/             # Static assets
└── data/               # Local fallback data templates
```

---

## 📝 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for the full text.

---

<div align="center">
Built with ❤️ for Storytellers.
</div>
