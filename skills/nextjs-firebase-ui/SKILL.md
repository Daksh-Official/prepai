---
name: prepai-frontend-data
description: Builds Next.js UI components that interact with Firestore and local media.
use_when: Building dashboard components, fetching interview reports, or handling video playback.
---

### Objective
Build responsive frontend components using Tailwind CSS while strictly adhering to local storage security constraints.

### Execution Steps
1. Fetch interview data exclusively from Firestore using the `users/{userId}/behavioral_reports/{docId}` schema.
2. Render the data using Recharts where applicable for "Executive Coach" level feedback.
3. Serve all video assets through the custom Gatekeeper API at `/api/video?file=X&userId=Y`.
4. Prevent any implementation of Firebase Storage or AWS S3 SDKs.