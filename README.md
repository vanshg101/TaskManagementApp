# Task Management App

Kanban-style task management application for personal or team productivity.

## Status

The simple MVP and automated API tests are complete. See [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) for the complete delivery plan.

## Simple stack

- Node.js built-in HTTP server
- Plain HTML, CSS, and browser JavaScript
- Server-side in-memory data model for the assessment MVP
- PostgreSQL persistence when `USE_MEMORY` is not set to `true`

## Development

The application is being implemented incrementally. The MVP keeps the code intentionally small while demonstrating all PDS requirements.

### Run the backend

```bash
npm start
```

The API listens on `http://localhost:3000` by default.

Open `http://localhost:3000` in a browser to use the Kanban board.

The development environment can use the running PostgreSQL container with the values in `.env.example`. The database schema and seed data are created automatically on first start.

### Test

```bash
npm test
```

The test suite covers the health endpoint, board counters, task validation, task updates, workload balancing, task deletion, and member creation.

## Source requirements

The requirements are based on the supplied `Vibe Coding _ Q.pdf`.
