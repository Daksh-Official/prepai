---
name: prepai-fastapi-endpoint
description: Generates or modifies local FastAPI routes for AI media analysis.
use_when: Creating backend logic for video analysis, DeepFace integration, or OpenCV processing.
---

### Objective
Create secure, local Python API routes for media analysis without relying on external cloud storage.

### Execution Steps
1. Define the endpoint within `prepai-python-service/main.py`.
2. Configure the route to accept media passed directly from the Next.js `/api/upload` endpoint.
3. Apply DeepFace for emotion detection and OpenCV for frame extraction.
4. Ensure the application is designed to run locally on port 8000 using the standard uvicorn reload command.