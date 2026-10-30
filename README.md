 # SpeakSheet - Voice-First Spreadsheet SaaS 
Set-Content -Path README.md -Value "# SpeakSheet 🚀
> **An Advanced Voice-First Spreadsheet Management & Multi-Channel Outreach SaaS**

SpeakSheet is a production-ready, cutting-edge web application designed to bridge the gap between raw spreadsheet data and multi-channel communication through autonomous voice command parsing. It transforms static spreadsheets and manual data workflows into an intelligent, hands-free command center for modern developers, sales teams, and data analysts.

---

## 📌 Table of Contents
1. [The Problem](#-the-problem)
2. [The Solution](#-the-solution)
3. [Key Features & Capabilities](#-key-features--capabilities)
4. [Tech Stack & Architecture](#️-tech-stack--architecture)
5. [Step-by-Step Workflow](#-step-by-step-workflow)
6. [Getting Started Locally](#-getting-started-locally)

---

## 🔴 The Problem
Managing large-scale datasets, performing data hygiene, and executing multi-channel outreach have traditionally been painfully manual, fragmented, and time-consuming tasks:
* **Workflow Fatigue:** Users waste countless hours manually filtering spreadsheets, cleaning duplicate rows, computing financial totals, and cross-referencing records.
* **Tool Switching:** Operators have to constantly switch between spreadsheet software, analytics dashboards, and external messaging tools (Email, LinkedIn, WhatsApp, SMS) to run campaigns.
* **Lack of Hands-Free Efficiency:** Existing data management software lacks intuitive voice control, forcing users into tedious mouse-and-keyboard navigation during high-speed operational tasks.

---

## 🟢 The Solution
**SpeakSheet** solves these bottlenecks by introducing an intelligent, voice-first ecosystem:
* **Autonomous Voice Parsing:** Converts natural spoken English commands into direct data manipulations and communication triggers instantly.
* **Unified Workspace:** Combines data cleaning, live data visualization, and outreach execution into a single, cohesive, high-performance web interface.
* **Safe Staging Workflow:** Ensures that no voice command executes blindly—every intent is previewed in a staging area before final execution, guaranteeing absolute data integrity.

---

## 🌟 Key Features & Capabilities

1. **Voice-Driven Data Cleaning & Computations:**
   * Speak natural commands into the microphone (e.g., *\"Calculate total spend\"*, *\"Deduplicate records\"*, or *\"Filter won deals\"*).
   * The built-in voice engine instantly parses user intent, executes the computational logic, and displays computed outputs via glowing, high-contrast result banners.

2. **Dynamic Live CSV Analytics:**
   * Uploading a fresh CSV dataset instantly transforms Tab 2 into a dynamic analytics engine.
   * Auto-detects numerical and categorical columns to render real-time KPI cards, interactive Recharts bar charts, pie charts, and trend distributions on the fly.

3. **Targeted Multi-Channel Outreach Studio:**
   * Eliminates cumbersome copy-pasting by orchestrating personalized outreach campaigns across **Email, LinkedIn, WhatsApp, and SMS**.
   * Supports both individual outreach dispatching and multi-recipient batch execution via voice commands.

4. **Safe Staging & Real-Time Audit Trails:**
   * Features an intelligent voice staging workflow where dictated intents are previewed before execution.
   * Every dispatched message and operation is permanently logged in a live terminal with timestamps, channel badges, recipient names, and status indicators.

---

## 🛠️ Tech Stack & Architecture
* **Frontend Framework:** React (Vite), TypeScript / JavaScript
* **Styling & UI:** Tailwind CSS, Lucide Icons, Custom Glassmorphism UI components
* **Data Visualization:** Recharts (Interactive KPI and trend graphing)
* **Voice Processing:** Web Speech API / Custom Voice Intent Parser Engine
* **State Management & Routing:** React Hooks & Component-level modular architecture

---

## 🔄 Step-by-Step Workflow
1. **Data Ingestion:** Upload a custom CSV file or load structured default mock datasets into the workspace.
2. **Voice Control Activation:** Click the microphone or use voice command triggers to dictate actions (e.g., sorting, computing sums, or filtering).
3. **Staging & Verification:** Review the parsed intent and structured output in the command banner.
4. **Analytics & Outreach:** Switch to the analytics tab to visualize metrics via Recharts, or head to the Outreach Studio to dispatch targeted messages across channels with real-time audit logging.

---

## 🚀 Getting Started Locally

To run this project locally on your machine, follow these steps:

1. **Clone the repository:**
   \`\`\`bash
   git clone https://github.com/ayushyadav32/speaksheet.git
   cd speaksheet
   \`\`\`

2. **Install dependencies:**
   \`\`\`bash
   npm install
   \`\`\`

3. **Run the development server:**
   \`\`\`bash
   npm run dev
   \`\`\`" -Encoding utf8