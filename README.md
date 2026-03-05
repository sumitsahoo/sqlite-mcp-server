# 🚀 SQLite MCP Server & DataStudio

Welcome to the **SQLite MCP Server** and **DataStudio** project! This repository contains a complete, end-to-end solution for querying a local SQLite database using the powerful Model Context Protocol (MCP). It features both traditional SQL queries and an advanced **Ask AI** natural language interface.

This project is split into two main parts:
1.  **Server (`/server`)**: A Node.js Express server that wraps a `better-sqlite3` database and exposes MCP tools over Server-Sent Events (SSE). It also includes a LangGraph agent to handle natural language queries.
2.  **Client (`/client`)**: A beautiful, glassmorphic React 19 application built with Vite and Tailwind CSS v4 to interact with the server.

---

## 🛠 Prerequisites

Before you begin, ensure you have the following installed on your machine:
-   **Node.js** (v18 or higher recommended)
-   **npm** (comes with Node.js)
-   An **OpenAI API Key** (required for the "Ask AI" natural language feature)

---

## 🚀 Getting Started

Follow these steps to get both the server and the client up and running.

### 1. Set up the Server

First, let's get the SQLite database and the MCP API running.

1.  Open your terminal and navigate to the `server` directory:
    ```bash
    cd server
    ```
2.  Install the necessary dependencies:
    ```bash
    npm install
    ```
3.  Configure your environment variables:
    *   Open the `/server/.env` file.
    *   Add your OpenAI API key:
        ```env
        OPENAI_API_KEY=your_actual_api_key_here
        ```
4.  Start the development server:
    ```bash
    npm run dev
    ```
    *🎉 The server should now be running! It will automatically create a `database.sqlite` file in the root directory and seed it with some sample `products` data if it doesn't already exist.*

### 2. Set up the Client (DataStudio)

Now, let's fire up the beautiful React frontend.

1.  Open a **new** terminal window/tab and navigate to the `client` directory:
    ```bash
    cd client
    ```
2.  Install the dependencies:
    ```bash
    npm install
    ```
3.  Start the Vite development server:
    ```bash
    npm run dev
    ```
4.  Open your browser and navigate to the URL provided in the terminal (usually `http://localhost:5173/`).

---

## 💻 How to Use DataStudio

Once you have both the server and client running, you can start exploring your data!

### 🟢 Status Check
Look at the top left corner. You should see a green dot and the text **"Server Connected"**. If it says disconnected, ensure your server is running on port `3001`.

### 🗄 Exploring the Schema
1.  On the left sidebar, click on the **`products`** table under the "Databases" section.
2.  The main panel will update to show you the exact SQL `CREATE TABLE` statement and columns for that table.

### 📝 Running Raw SQL
1.  Ensure you are on the **"Raw SQL"** tab.
2.  Type a standard SELECT query into the editor. For example:
    ```sql
    SELECT name, price, stock FROM products WHERE price > 100 ORDER BY price DESC;
    ```
3.  Click the **"Run Query"** button (or press Enter).
4.  The results will immediately populate in the sleek data table below!

### ✨ Ask AI (Natural Language Queries)
1.  Switch to the **"Ask AI (NL)"** tab.
2.  Type a question in plain English into the prompt box. For example:
    *   *"Show me the 3 most expensive items."*
    *   *"What is the total stock of all electronics?"*
    *   *"Find products that cost less than $50."*
3.  Click the **"Ask Agent"** button.
4.  The AI will analyze your prompt, connect to the database schema, write the SQL, and execute it!
5.  Watch as the UI reveals:
    *   🧠 **Agent Thought**: How the AI approached your question.
    *   💻 **Generated SQL**: The exact SQL code it wrote.
    *   📊 **Results**: The exact rows returned from the database.

---

## 📁 Project Structure

```text
sqlite-mcp-server/
├── server/                 # Backend Node.js Express application
│   ├── src/
│   │   ├── index.ts        # Main Express server and MCP tool registration
│   │   ├── db.ts           # SQLite database connection and initialization
│   │   └── agent.ts        # LangGraph ReAct agent for Natural Language processing
│   ├── package.json
│   └── .env                # OpenAI API Key goes here!
├── client/                 # Frontend React 19 application
│   ├── src/
│   │   ├── App.tsx         # Main Datastudio UI component
│   │   ├── index.css       # Premium Tailwind v4 styling
│   │   └── lib/mcp.ts      # MCP Server-Sent Events (SSE) connection hook
│   └── package.json
├── database.sqlite         # The generated local SQLite database
└── .gitignore
```

Enjoy exploring your data with the power of MCP and AI! 🎈
