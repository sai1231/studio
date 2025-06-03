
# Mati - Save and Organize Your Thoughts

Mati is your personal space to save, tag, and rediscover web links, notes, and ideas effortlessly. This is a Next.js project bootstrapped with `create-next-app` and enhanced with Firebase Studio.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

*   **Node.js**: Version 18.x or later (Node.js 20.x is recommended). You can download it from [nodejs.org](https://nodejs.org/).
*   **npm** (Node Package Manager) or **yarn**: These usually come with Node.js. This project uses npm by default (as per `package.json` scripts).

## Getting Started

1.  **Clone the Repository** (if you haven't already):
    ```bash
    git clone <repository-url>
    cd <repository-name>
    ```
    (If you are already working within Firebase Studio, you can skip this step as the files are already present.)

2.  **Navigate to the Project Directory**:
    If you cloned the repository, you should already be in the project directory. If you downloaded the source code, navigate to its root folder.

## Installation

Install the project dependencies using npm (or yarn if you prefer):

```bash
npm install
```

Alternatively, if you use yarn:

```bash
yarn install
```

## Environment Variables

This project uses an environment file to manage configuration.

1.  Create a new file named `.env` in the root of your project directory.
2.  Copy the contents of `.env.example` (if one exists) or add necessary environment variables. For this project, the `.env` file can initially be empty or include variables like:
    ```env
    # Example (currently no specific backend variables are strictly required for mock data mode)
    # NEXT_PUBLIC_API_URL=http://localhost:3000/api
    ```
    *Note: At present, the application uses mock data and services within `src/services/contentService.ts`, so no backend-specific environment variables are strictly required to run it with mock data. If you integrate a backend like Supabase or Appwrite, you will add their specific API keys and URLs here.*

## Running the Development Server

To start the Next.js development server, run the following command:

```bash
npm run dev
```

This will start the application in development mode, typically on port `9002` (as specified in `package.json` `scripts.dev`). The `--turbopack` flag is used for faster development builds.

## Accessing the Application

Once the development server is running, you can access the application in your web browser at:

[http://localhost:9002](http://localhost:9002)

You should see the Mati application interface. The console in your terminal will show output from the Next.js server, including any build information or errors.

## Building for Production

To create an optimized production build, run:

```bash
npm run build
```

And to start the production server:

```bash
npm run start
```

## Linting and Type Checking

To lint the code:

```bash
npm run lint
```

To perform a TypeScript type check:

```bash
npm run typecheck
```
