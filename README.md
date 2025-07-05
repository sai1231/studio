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

### User Experience
- **Cross-Platform**: Access your content seamlessly via the web application or the mobile app (iOS & Android).
- **Secure Authentication**: User accounts are secured using Firebase Authentication, with support for both email/password and Google Sign-In.
- **Admin Portal**: A separate, secure admin portal for managing users, roles, and application settings.
- **Role-Based Access Control (RBAC)**: A flexible role system to define different feature sets and limits for various user tiers (e.g., Free, Pro, Admin).

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS with ShadCN UI components
- **State Management**: React Context API
- **Authentication & Database**: Firebase (Auth, Firestore, Storage)
- **AI & Backend Flows**: Google AI & Genkit
- **Client-Side Search**: FlexSearch
- **Mobile**: React Native (Expo)

## Monorepo Structure

The project is organized into several key directories:

- `/` (root): Contains the main Next.js web application.
- `/admin`: A separate Next.js application for the Admin Portal.
- `/mobile`: The React Native (Expo) mobile application.
- `/functions`: A placeholder for future Python Cloud Functions.
- `/src`: Source code for the main web app.

## Prerequisites

Ensure you have the following installed on your system:
*   **Node.js**: Version `^18.18.0`, `^19.8.0`, or `>=20.0.0`
*   **npm** (or yarn/pnpm)

## Environment Setup

This project requires environment variables for Firebase and other services. Create a `.env` file in the root directory and populate it with your credentials.

```sh
# .env

# Firebase Configuration (Required for Web App & Admin Portal)
# Find these in your Firebase project settings
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# AI & Services Configuration (Required for AI features)
MOONDREAM_API_KEY=
NEXT_PUBLIC_TMDB_API_KEY=

# --- Mobile App Specific ---
# For the mobile app, create a separate .env file inside the /mobile directory.
# These are required for Google Sign-In on mobile.
# EXPO_PUBLIC_GOOGLE_CLIENT_ID_FOR_WEB=
# EXPO_PUBLIC_GOOGLE_CLIENT_ID_FOR_IOS=
# EXPO_PUBLIC_GOOGLE_CLIENT_ID_FOR_ANDROID=
```

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

You can run each part of the application in a separate terminal.

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

## Available Scripts

The following scripts are available in the root `package.json`:

| Script        | Description                                  |
|---------------|----------------------------------------------|
| `npm run dev`     | Starts the main web app in development mode. |
| `npm run build`   | Creates a production build of the web app.   |
| `npm run start`   | Starts the production server for the web app.|
| `npm run lint`    | Lints the codebase for errors.               |
| `npm run typecheck`| Performs a TypeScript type check.          |
