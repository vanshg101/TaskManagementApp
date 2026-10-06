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

## Simple implementation direction

To keep the assessment solution small and easy to explain, the first working version uses:

- A single Node.js server with the built-in HTTP module.
- A plain HTML, CSS, and browser JavaScript frontend.
- A small server-side data store with clear API boundaries.

This avoids unnecessary framework setup while preserving the required behavior. The data layer can be replaced by PostgreSQL later without changing the board UI or API contract.

## Phases and commit gates

### Phase 0 — Project baseline

- Create repository documentation and hygiene files.
- Establish frontend/backend project boundaries.
- Configure environment variables and scripts.
- Add a minimal backend health endpoint.
- Verify the baseline with lint/type/build checks where available.

Commit: `chore: initialize task management application`

### Phase 1 — Simple data model and API

- Add a small project, user, membership, and task model.
- Seed representative tasks and team members.
- Expose the board and task CRUD through the backend.
- Keep validation and workload calculations on the server.

Commit: `feat: add relational task management data model`

### Phase 2 — Board UI

- Render the three Kanban columns and counters.
- Add task creation, editing, deletion, and priority filtering.
- Add drag-and-drop status changes.

Commit: `feat: implement project and membership APIs`

### Phase 3 — Team and workload UI

- Display project members and task assignments.
- Add members to the project.
- Display the red warning for users with more than five in-progress tasks.

Commit: `feat: implement task CRUD and Kanban state APIs`

### Phase 4 — Testing and polish

- Add unit, API integration, and frontend tests.
- Verify responsive and accessible behavior.
- Complete setup documentation.

Commit: `test: cover task management workflows`

### Phase 5 — Release preparation

- Remove debug artifacts.
- Verify clean setup, migrations, tests, and production build.
- Confirm repository visibility and final Git history.

Commit: `chore: prepare task management app for submission`

## Definition of done

- The complete board workflow works through the simple API.
- Task and membership mutations are validated server-side.
- Drag-and-drop changes persist.
- Priority filtering and column counters are accurate.
- Workload warnings use the server-calculated threshold `> 5`.
- Automated tests cover the important business rules.
- The README provides reproducible setup and run instructions.
