# Task Management App Implementation Plan

## Product goal

Build a Kanban-style task management application for personal or team productivity.

## Requirements

### Kanban board

- Three columns: `To-Do`, `In Progress`, and `Done`.
- Drag and drop tasks between columns.
- Show an accurate task counter for every column.
- Filter tasks by priority.

### Tasks

- Create, view, update, and delete tasks.
- Store title, description, priority, due date, status, project, and assignee.
- Validate all task input on the server.
- Persist status changes through the API.

### Projects and team members

- Store projects and their tasks in a relational database.
- Add and remove users from projects.
- Assign tasks only to users who belong to the project.
- Store user permissions and project membership.

### Workload balancing

- Calculate each user's number of `In Progress` tasks on the server.
- If a user has more than five such tasks, mark that user as overloaded.
- Display an accessible red pulsing warning on the user's team avatar.

## Technical direction

The default implementation stack is:

- React and TypeScript for the frontend.
- Node.js, Express, and TypeScript for the backend.
- PostgreSQL with Prisma for persistence.
- Vitest and Supertest for automated tests.

Existing repository conventions take precedence if a GitHub repository is supplied with an established stack.

## Phases and commit gates

### Phase 0 — Project baseline

- Create repository documentation and hygiene files.
- Establish frontend/backend project boundaries.
- Configure environment variables and scripts.
- Add a minimal backend health endpoint.
- Verify the baseline with lint/type/build checks where available.

Commit: `chore: initialize task management application`

### Phase 1 — Database and domain models

- Configure PostgreSQL and Prisma.
- Add users, projects, project members, and tasks.
- Add status, priority, and role enums.
- Add migrations and representative seed data.

Commit: `feat: add relational task management data model`

### Phase 2 — Project and membership APIs

- Implement project CRUD.
- Implement project member listing, creation, and removal.
- Add validation and consistent error responses.

Commit: `feat: implement project and membership APIs`

### Phase 3 — Task CRUD and Kanban APIs

- Implement task CRUD.
- Implement status changes and priority filtering.
- Return accurate column counters.
- Validate project membership and task input.

Commit: `feat: implement task CRUD and Kanban state APIs`

### Phase 4 — Workload balancing

- Add the server-side workload calculation service.
- Return per-user in-progress counts and `overloaded` state.
- Test the five-task boundary and multi-user behavior.

Commit: `feat: add server-side workload balancing`

### Phase 5 — Kanban frontend

- Build the board, columns, task cards, counters, filters, and create-task flow.
- Add loading, empty, and error states.

Commit: `feat: build Kanban board interface`

### Phase 6 — Drag and drop and task editing

- Persist drag-and-drop status changes.
- Add task editing, deletion, due dates, and priority display.
- Roll back failed mutations.

Commit: `feat: add task drag-and-drop and editing`

### Phase 7 — Team and workload UI

- Display project members.
- Add and remove members.
- Display workload counts and the overloaded avatar warning.

Commit: `feat: add team management and workload indicators`

### Phase 8 — Testing and documentation

- Add unit, API integration, and frontend tests.
- Verify responsive and accessible behavior.
- Complete setup and API documentation.

Commit: `test: cover task management workflows`

### Phase 9 — Release preparation

- Remove debug artifacts.
- Verify clean setup, migrations, tests, and production build.
- Confirm repository visibility and final Git history.

Commit: `chore: prepare task management app for submission`

## Definition of done

- The complete board workflow works against PostgreSQL.
- Task and membership mutations are validated server-side.
- Drag-and-drop changes persist.
- Priority filtering and column counters are accurate.
- Workload warnings use the server-calculated threshold `> 5`.
- Automated tests cover the important business rules.
- The README provides reproducible setup and run instructions.
