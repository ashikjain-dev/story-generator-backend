# Story Generator Backend

A Node.js backend API that will eventually generate creative stories from YouTube transcripts or text prompts.

This is currently a foundational setup containing only the basic Express server.

## Tech Stack (Current)
- Node.js & TypeScript
- Express
- Morgan (Logging)
- express-rate-limit (Rate Limiting)

## Features Built So Far
- **Health Check API:** `/health` endpoint to monitor server status.
- **Global Middlewares:** CORS, JSON parsing, rate limiting (10 req/min), and custom IST Morgan logging.

