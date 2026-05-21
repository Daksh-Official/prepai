---
name: prepai-vercel-build
description: Handles Next.js configuration, environment variables, and build checks for Vercel deployment.
use_when: Modifying next.config.ts, package.json, or troubleshooting Vercel build errors.
---

### Objective
Ensure the Next.js frontend builds cleanly on Vercel without relying on the local Python backend during the build phase.

### Execution Steps
1. Verify `next.config.ts` handles any necessary rewrites or CORS configurations.
2. Ensure environment variables (like Firebase config) are correctly referenced in the code and do not expose sensitive keys.
3. Confirm that the application does not attempt to contact the local FastAPI (`localhost:8000`) during static generation or build time.
4. Run linting (`npm run lint`) and type checking before finalizing changes.