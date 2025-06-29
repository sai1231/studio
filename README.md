
# Mati - Save and Organize Your Thoughts

Mati is your personal space to save, tag, and rediscover web links, notes, and ideas effortlessly. This is a monorepo containing the Next.js web application and the upcoming React Native mobile app.

## Project Structure

- `/src`: Contains the source code for the Next.js web application.
- `/mobile`: Contains the placeholder and (eventually) the source code for the React Native mobile app.

## Prerequisites

Before you begin, ensure you have the following installed on your system:

*   **Node.js**: Version `^18.18.0` or `^19.8.0` or `>=20.0.0`.
    *   _You can check your Node.js version by running `node -v` in your terminal._
    *   _If your version is lower, you'll need to update it. Using a Node Version Manager (like [nvm](https://github.com/nvm-sh/nvm) or [n](https://github.com/tj/n)) is highly recommended for managing multiple Node.js versions._
*   **npm** (Node PackageManager) or **yarn**: These usually come with Node.js. This project uses npm by default (as per `package.json` scripts).

## Getting Started

### Web Application

1.  **Navigate to the Project Directory**:
    If you cloned the repository, you should already be in the project directory. If you downloaded the source code, navigate to its root folder.

2.  **Installation**:
    Install the project dependencies using npm (or yarn if you prefer):
    ```bash
    npm install
    ```

3.  **Environment Variables**:
    This project uses an environment file to manage configuration. Create a new file named `.env` in the root of your project directory and add the necessary Firebase credentials.

4.  **Running the Development Server**:
    To start the Next.js development server, run the following command:
    ```bash
    npm run dev
    ```
    The application will be accessible at [http://localhost:9002](http://localhost:9002).

### Mobile Application

To get started with the mobile app, please see the instructions in the `mobile/README.md` file.

## Building for Production

To create an optimized production build of the web app, run:

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
