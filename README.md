<div align="center">
    
# Plothole v3
### Your Story, Decoded.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Build Tool: Vite](https://img.shields.io/badge/Build%20Tool-Vite-646CFF.svg)](https://vitejs.dev/)
[![Framework: React](https://img.shields.io/badge/Framework-React-61DAFB.svg)](https://reactjs.org/)
[![AI: Gemini](https://img.shields.io/badge/AI-Gemini%20Flash-8E75C2.svg)](https://deepmind.google/technologies/gemini/)

</div>

**Plothole** is an AI-powered narrative architecture tool designed for novelists, world-builders, and screenwriters. It transforms raw manuscripts and research material into a living, interconnected encyclopedia of your narrative universe.

---

## 🚀 Key Features

### 1. The Oracle (AI Mission Control)
A deep-integrated Gemini-powered terminal that understands your entire story. Use it to scan manuscripts for plot holes, generate character biographies, or synthesize complex lore based on your research.

### 2. Narrative Ledger (Semantic Database)
A unified, spreadsheet-style explorer for all narrative entities. Plothole standardizes your data using industry-standard formats:
*   **Characters:** Standardized to [Schema.org/Person](https://schema.org/Person).
*   **Timeline Events:** Powered by **ISO-8601** and [Schema.org/Event](https://schema.org/Event).
*   **Lore & Codex:** Organized via **SKOS** (Simple Knowledge Organization System).
*   **Research Sources:** Cataloged with **Dublin Core (DCMI)** and **BibTeX**.
*   **Relationships:** Mapped using **JSON Graph Format (JGF)** and **RDF Triples**.

### 3. World Atlas (Interactive Mapping)
A GeoJSON-powered mapping engine that supports both real-world OpenStreetMap integration and custom fantasy maps. Includes "Smart Portals" for instant navigation between distant story hubs (e.g., jumping from Los Angeles to London).

### 4. Semantic Notepad & Prose Engine
A dual-mode writing environment:
*   **Stream View:** A chronological feed for rapid-fire idea capture.
*   **Prose View:** A professional, block-based rich text editor powered by **Tiptap**, featuring automatic saving and semantic grounding.

### 5. Research Library (The Bundle Method)
A specialized ingestion pipeline that pairs raw source files (PDFs, Images, TXT) with:
*   `index.json`: Machine-readable metadata.
*   `extracted.md`: Clean, AI-processed Markdown transcripts.

---

## 🛠 Tech Stack

*   **Frontend:** React 19, TypeScript, Tailwind CSS
*   **State & Routing:** React Router 7, React Flow (@xyflow/react)
*   **Editor:** Tiptap (ProseMirror)
*   **Database Search:** Fuse.js (Fuzzy Matching)
*   **Maps:** Leaflet & OpenStreetMap
*   **Intelligence:** Google Gemini GenAI SDK
*   **Auth:** Clerk (Identity & Session Management)
*   **Backend:** Node.js, Express, tsx
*   **Versioning:** simple-git (Automated story versioning)

---

## ⚡️ Quick Start

### Prerequisites
*   [Node.js](https://nodejs.org/) (Latest LTS recommended)
*   A [Google AI Studio](https://aistudio.google.com/) API Key
*   A [Clerk](https://clerk.com/) account for authentication

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
    Create a `.env` file in the root directory:
    ```env
    VITE_CLERK_PUBLISHABLE_KEY=your_clerk_key
    CLERK_SECRET_KEY=your_clerk_secret
    GEMINI_API_KEY=your_gemini_key
    ```

4.  **Run for development:**
    ```bash
    npm run dev
    ```

---

## 📂 Project Structure

```text
├── src/
│   ├── components/
│   │   ├── Views/      # Page-level components (Atlas, Ledger, Notepad)
│   │   ├── Layout/     # Sidebar, Navigation
│   │   └── ui/         # Reusable widgets (Map, Editor, Graph)
│   ├── services/       # AI logic, Storage, Git integration
│   ├── utils/          # Calendar engines, Citation formatters
│   └── types.ts        # Unified Type definitions
├── server.ts           # Express backend for storage & PDF processing
├── public/             # Static assets & generated license manifest
└── source/             # Server-side repository for project sidecars
```

---

## 📝 License

This project is licensed under the **MIT License**. See the [LICENSE](LICENSE) file for the full text.

### Third-Party Licenses
Plothole relies on several incredible open-source projects. A comprehensive manifest of all dependencies and their licenses can be found in [THIRD-PARTY-NOTICES.txt](THIRD-PARTY-NOTICES.txt).

---

<div align="center">
Built with ❤️ for Storytellers.
</div>
