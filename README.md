# Mäti: Your Intelligent Clipboard

Mäti is a modern, cross-platform application designed to be your personal digital memory bank. It goes beyond simple link-saving, offering a rich environment to save, automatically categorize, and rediscover web links, notes, images, PDFs, and voice memos with the power of AI.

This repository is a monorepo containing the main web application, a separate admin portal, and the cross-platform mobile app.

## Features

Mäti is packed with features to make saving and organizing your digital life seamless and intelligent.

### Core Functionality
- **Multi-Content Support**: Save more than just links. Mäti supports notes, images, PDF documents, and even voice recordings.
- **Drag & Drop**: Effortlessly save content by dragging files, links, or text directly into the application window.
- **Zones**: Organize your content into distinct "Zones" (e.g., Work, Personal, Inspiration) for a clean, focused workspace.
- **Tagging System**: Add custom tags to any item for granular organization and easy filtering.
- **Powerful Search**: A blazing-fast, client-side search powered by FlexSearch allows you to find any item by its title, description, tags, or domain.
- **Task Management**: A built-in TODO list helps you keep track of actionable items and stay productive.
- **Declutter Tool**: A dedicated feature to review your oldest content, helping you decide what to keep or delete to maintain a tidy collection.

### AI-Powered Enrichment
- **Automatic Tagging**: AI automatically suggests relevant tags by analyzing the content of your saved items.
- **Image Captioning**: Images are automatically analyzed to generate descriptive captions, making them easier to search.
- **Color Palette Extraction**: Dominant colors are extracted from saved images, providing a visual palette for inspiration.
- **Smart Title Generation**: Notes and other text-based content get automatically generated titles.
- **Movie Details**: Saving a link from IMDb will automatically enrich it with movie details like poster, cast, rating, and director from TMDb.

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with ShadCN UI components
- **State Management**: React Context API
- **Authentication & Database**: Firebase (Auth, Firestore, Storage)
- **AI & Backend Flows**: Google AI & Genkit
- **Client-Side Search**: Meilisearch (Self-hosted)
- **Mobile**: React Native (Expo)

## Monorepo Structure

The project is organized into several key directories:

- `/` (root): Contains the main Next.js web application.
- `/admin`: A separate Next.js application for the Admin Portal.
- `/mobile`: The React Native (Expo) mobile application.
- `/extension`: The browser extension for Chrome and other Chromium browsers.
- `/functions`: A placeholder for future Python Cloud Functions.
- `/src`: Source code for the main web app.

## Prerequisites

Ensure you have the following installed on your system:
*   **Node.js**: Version `^18.18.0`, `^19.8.0`, or `>=20.0.0`
*   **npm** (or yarn/pnpm)
*   **Docker** (for running Meilisearch)

## Environment Setup

This project uses environment variables for Firebase and other services.

**1. Create your environment file:**

Copy the example file to a new file named `.env`:
```sh
cp .env.example .env
```
**Important:** The `.env` file is listed in `.gitignore` and should never be committed to version control.

**2. Populate `.env` with your credentials:**

Open the newly created `.env` file and fill in the values.

```env
# .env

# Firebase Configuration (Required)
# Find these in your Firebase project settings > General
NEXT_PUBLIC_FIREBASE_API_KEY=...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
NEXT_PUBLIC_FIREBASE_APP_ID=...

# AI & Services Configuration (Optional, for AI features)
# Get a key from https://ai.google.dev/
GOOGLE_API_KEY=...
# Get a key from https://www.themoviedb.org/
NEXT_PUBLIC_TMDB_API_KEY=...

# Meilisearch Configuration (Required for Search)
# See "Running Meilisearch" section below.
# IMPORTANT: When running in Docker, the Next.js container must use 'host.docker.internal' 
# to communicate with the Meilisearch container running on the host machine.
MEILISEARCH_HOST=http://host.docker.internal:7700
MEILISEARCH_MASTER_KEY=...
```

**3. Mobile App Environment:**
For the mobile app, create a separate `.env` file inside the `/mobile` directory. Refer to the `mobile/README.md` for the required variables.

## Running Meilisearch

The search feature is powered by a self-hosted Meilisearch instance running in Docker.

1.  **Pull the Meilisearch image:**
    ```sh
    docker pull getmeili/meilisearch:v1.15
    ```

2.  **Run the Docker container:**
    Replace `YOUR_MASTER_KEY` with a secure, randomly generated key. This key must match the one in your `.env` file.
    ```sh
    docker run --env="MEILI_MASTER_KEY=YOUR_MASTER_KEY" -p 7700:7700 -v "$(pwd)/meili_data:/meili_data" getmeili/meilisearch:v1.15
    ```
    This command starts Meilisearch and maps its data directory to a `meili_data` folder in your project root to persist the search index.

## Getting Started

### 1. Install All Dependencies

First, install the necessary dependencies for all parts of the monorepo.

```bash
# Install dependencies for the main web app
npm install

# Install dependencies for the Admin Portal
cd admin
npm install
cd ..

# Install dependencies for the Mobile App
cd mobile
npm install
cd ..
```

### 2. Run the Applications

You can run each part of the application in a separate terminal. Make sure your Meilisearch container is running first.

#### Web Application (Mäti)
```bash
# From the root directory
npm run dev
```
The application will be accessible at **http://localhost:9002**.

#### Admin Portal
```bash
# From the root directory, run the admin dev script
cd admin
npm run dev
```
The admin portal will be accessible at **http://localhost:9003**.

#### Mobile App
Refer to the `mobile/README.md` for detailed instructions on running the Expo app on a simulator or physical device.

## Browser Extension Setup

To use the browser extension for saving content:

1.  In a Chromium-based browser (like Chrome, Edge, or Arc), navigate to `chrome://extensions`.
2.  Enable **Developer mode** using the toggle in the top-right corner.
3.  Click the **Load unpacked** button.
4.  In the file dialog, select the `extension` folder located in the root of this project.
5.  The Mäti icon will appear in your browser's toolbar. You can pin it for easy access.

## Available Scripts

The following scripts are available in the root `package.json`:

| Script        | Description                                  |
|---------------|----------------------------------------------|
| `npm run dev`     | Starts the main web app in development mode. |
| `npm run build`   | Creates a production build of the web app.   |
| `npm run start`   | Starts the production server for the web app.|
| `npm run lint`    | Lints the codebase for errors.               |
| `npm run typecheck`| Performs a TypeScript type check.          |
