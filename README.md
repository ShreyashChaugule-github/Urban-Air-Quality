# Clear Air

Clear Air is a JavaScript Next.js app for household routines during winter smog, with an events directory, Firebase email/password authentication, and a server-side AI assistant.

# Urban Air Quality | Clear Air

Clear Air is a household-focused assistant for navigating winter smog and urban air pollution. It combines practical daily routines, indoor-air suggestions, sustainable alternatives, community events, and optional AI guidance in a responsive web app.

## Contents

- [What it does](#what-it-does)
- [Technology](#technology)
- [Getting started](#getting-started)
- [Docker](#docker)
- [Firebase authentication](#firebase-authentication)
- [AI assistant](#ai-assistant)
- [Privacy and safety](#privacy-and-safety)
- [Project structure](#project-structure)
- [Quality checks](#quality-checks)
- [Deployment](#deployment)

## What it does

- Builds a household plan from the user's city, commute, cooking fuel, heating, air-cleaning setup, household needs, and entered PM2.5 value.
- Offers daily routine, indoor-air, and sustainable-swap suggestions with a plain-language explanation of their likely impact.
- Answers follow-up questions with the optional AI service, or topic-aware offline guidance when AI is unavailable.
- Clearly distinguishes user-entered PM2.5 values from live readings and explains that PM2.5 concentration is not AQI.
- Provides upcoming community listings and searchable, filterable event history.
- Supports Firebase email/password signup, sign-in, password reset, and sign-out.
- Includes responsive layouts, keyboard-operable controls, accessible labels and status messages, and reduced-motion handling.

## Technology

- Next.js App Router with JavaScript and React
- Firebase modular SDK for client-side Authentication
- Radix UI primitives styled in the shadcn/ui pattern for assistant selects and slider
- Next.js Route Handler for the server-side AI integration
- Node.js built-in test runner for API route tests

## Getting started

Requirements: Node.js 20 or newer and npm.

```sh
git clone https://github.com/ShreyashChaugule-github/Urban-Air-Quality.git
cd Urban-Air-Quality
npm install
cp .env.example .env.local
npm run dev
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). The planner, offline assistant, and event directory work without Firebase or an AI provider key. Restart the Next.js process after editing environment variables.

## Docker

Docker Desktop (or another Docker Engine with Compose v2) is required. Create `.env.local` from `.env.example`, then use Compose to build and start the production container:

```sh
cp .env.example .env.local
# Edit .env.local with your configuration.
docker compose --env-file .env.local up --build -d
```

Open [http://127.0.0.1:4173](http://127.0.0.1:4173). View logs or stop the service with:

```sh
docker compose logs -f clear-air
docker compose down
```

The multi-stage `Dockerfile` builds Next.js in standalone mode and runs it as a non-root user on port `4173`. `.dockerignore` keeps Git metadata, local environment files, dependencies, and build output out of the build context. Firebase `NEXT_PUBLIC_*` settings are supplied as build arguments because Next.js embeds public client configuration in the browser bundle; rebuild the image after changing those values. `AI_API_KEY` is provided only to the running container through `.env.local`, not as a Docker build argument.

To build without Compose, pass the Firebase `NEXT_PUBLIC_*` settings from your shell as `--build-arg` values to `docker build -f Dockerfile -t urban-air-quality:latest .`, then start the image with the runtime environment variables and `-p 4173:4173`.

## Firebase authentication

1. Create a Firebase project and register a Web app.
2. In Firebase Console, enable **Authentication > Sign-in method > Email/Password**.
3. Add `127.0.0.1` to **Authentication > Settings > Authorized domains** for local development. Add your production domain before deployment.
4. Put the Firebase Web app settings in `.env.local` using the `NEXT_PUBLIC_FIREBASE_*` names from `.env.example`.

The app implements email/password account creation, sign-in, password reset, session state, and sign-out. Firebase handles credential verification; Clear Air does not store passwords. Firebase Web app settings are public client configuration, not service-account credentials. Do not put Firebase Admin keys or other server secrets in `NEXT_PUBLIC_*` variables.

## AI assistant

To enable AI plan generation and chat, set a server-side provider key in `.env.local`:

```dotenv
AI_API_KEY=your-server-side-provider-key
AI_MODEL=gpt-4o-mini
```

`AI_API_KEY` is read only by the server route and must never be exposed with a `NEXT_PUBLIC_` prefix. `AI_MODEL` is optional and defaults to `gpt-4o-mini`. The route validates and bounds request data, keeps safety policy in a system message, applies request limits, and returns a rule-based client fallback when AI is not configured or available.

## Privacy and safety

- The app does not persist household profiles or conversations in its own database.
- Up to six recent chat messages are held in browser memory for follow-up context. When AI is enabled, the profile, question, and that bounded context are sent to the configured AI provider, subject to that provider's data policy.
- Avoid entering names or sensitive medical details into assistant prompts.
- The app does not connect to live air-quality monitors. Users must check current conditions using official local sources.
- Advice is general information, not diagnosis or medical care. Follow local health advisories and seek medical help for symptoms or urgent concerns.

## Project structure

```text
app/
	api/assistant/route.js   Validated server-side assistant endpoint
	login/page.js            Sign-in page
	signup/page.js           Account creation page
	page.js                  Main application route
	layout.js                Root layout and authentication provider
components/
	ui/                      Shared shadcn-style UI primitives
	AuthForm.js              Firebase email/password forms
	AuthProvider.js          Firebase session state
	ClearAirApp.js           Planner, assistant, and community events
lib/
	firebase.js              Firebase client initialization
test/
	assistant-route.test.js  Route validation and behavior tests
```

## Quality checks

```sh
npm test
npm run build
```

Development and production output use separate directories (`.next-dev` and `.next`) so a production build does not replace the live development server's manifests.

## Deployment

Deploy with a Node.js-compatible Next.js host. Configure the Firebase Web app values and server-only `AI_API_KEY` in the host's environment settings, add the production hostname to Firebase Authorized domains, and run `npm run build` followed by `npm start` (or use the host's supported Next.js runtime). Do not upload `.env.local`, `node_modules`, or `.next*` build output to source control.