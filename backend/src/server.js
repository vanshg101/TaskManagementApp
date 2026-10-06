import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { initializeDatabase, query } from "./db.js";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const useMemory = process.env.USE_MEMORY === "true";
const publicDirectory = fileURLToPath(new URL("../../public/", import.meta.url));
const statuses = new Set(["TODO", "IN_PROGRESS", "DONE"]);
const priorities = new Set(["LOW", "MEDIUM", "HIGH"]);
const users = [{ id: "u1", name: "Aarav", initials: "A", color: "#2563eb", role: "OWNER" }, { id: "u2", name: "Riya", initials: "R", color: "#9333ea", role: "MEMBER" }];
const tasks = [
  { id: "t1", title: "Plan the first sprint", description: "Break the project into small deliverables.", priority: "HIGH", dueDate: "2026-10-10", status: "TODO", assigneeId: "u1" },
  { id: "t2", title: "Create board layout", description: "Build the three-column board.", priority: "MEDIUM", dueDate: "2026-10-08", status: "IN_PROGRESS", assigneeId: "u2" },
  { id: "t3", title: "Write project notes", description: "Document the setup and decisions.", priority: "LOW", dueDate: "2026-10-07", status: "DONE", assigneeId: "u1" }
];

const sendJson = (response, status, body) => { response.writeHead(status, { "Content-Type": "application/json" }); response.end(status === 204 ? undefined : JSON.stringify(body)); };
async function readJson(request) { let body = ""; for await (const chunk of request) body += chunk; return body ? JSON.parse(body) : {}; }
function validate(input) {
  if (!input.title || typeof input.title !== "string" || !input.title.trim()) return "A task title is required";
  if (input.priority && !priorities.has(input.priority)) return "Invalid priority";
  if (input.status && !statuses.has(input.status)) return "Invalid status";
  return null;
}
function memoryBoard() {
  return { project: { id: "p1", name: "My Task Board", description: "A simple team task board." }, users: users.map((user) => ({ ...user, inProgressTaskCount: tasks.filter((task) => task.assigneeId === user.id && task.status === "IN_PROGRESS").length })).map((user) => ({ ...user, overloaded: user.inProgressTaskCount > 5 })), tasks, counts: Object.fromEntries([...statuses].map((status) => [status, tasks.filter((task) => task.status === status).length])) };
}
async function databaseBoard() {
  const project = (await query("SELECT id, name, description FROM projects WHERE id = 'p1'")).rows[0];
  const taskRows = (await query("SELECT id, title, description, priority, TO_CHAR(due_date, 'YYYY-MM-DD') AS \"dueDate\", status, assignee_id AS \"assigneeId\" FROM tasks WHERE project_id = 'p1' ORDER BY id")).rows;
  const memberRows = (await query("SELECT u.id, u.name, u.initials, u.color, u.role, COUNT(t.id) FILTER (WHERE t.status = 'IN_PROGRESS')::int AS \"inProgressTaskCount\" FROM users u JOIN project_members pm ON pm.user_id = u.id LEFT JOIN tasks t ON t.assignee_id = u.id AND t.project_id = 'p1' WHERE pm.project_id = 'p1' GROUP BY u.id ORDER BY u.id")).rows.map((user) => ({ ...user, overloaded: user.inProgressTaskCount > 5 }));
  const counts = Object.fromEntries((await query("SELECT status, COUNT(*)::int AS count FROM tasks WHERE project_id = 'p1' GROUP BY status")).rows.map((row) => [row.status, row.count]));
  return { project, users: memberRows, tasks: taskRows, counts: { TODO: counts.TODO ?? 0, IN_PROGRESS: counts.IN_PROGRESS ?? 0, DONE: counts.DONE ?? 0 } };
}
async function serveFile(request, response) {
  const requested = request.url === "/" ? "index.html" : request.url.slice(1); const filePath = path.resolve(publicDirectory, requested);
  if (!filePath.startsWith(path.resolve(publicDirectory))) return sendJson(response, 403, { error: "Forbidden" });
  try { const content = await readFile(filePath); const type = filePath.endsWith(".css") ? "text/css" : filePath.endsWith(".js") ? "text/javascript" : "text/html"; response.writeHead(200, { "Content-Type": type }); response.end(content); } catch { sendJson(response, 404, { error: "Not found" }); }
}
async function createTask(input) {
  const task = { id: `t${Date.now()}`, title: input.title.trim(), description: input.description ?? "", priority: input.priority ?? "MEDIUM", dueDate: input.dueDate || null, status: input.status ?? "TODO", assigneeId: input.assigneeId || null };
  if (useMemory) tasks.push(task); else await query("INSERT INTO tasks (id, project_id, title, description, priority, due_date, status, assignee_id) VALUES ($1, 'p1', $2, $3, $4, $5, $6, $7)", [task.id, task.title, task.description, task.priority, task.dueDate, task.status, task.assigneeId]);
  return task;
}
const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (request.method === "GET" && url.pathname === "/api/health") return sendJson(response, 200, { status: "ok", storage: useMemory ? "memory" : "postgres" });
    if (request.method === "GET" && url.pathname === "/api/board") return sendJson(response, 200, useMemory ? memoryBoard() : await databaseBoard());
    if (request.method === "GET" && url.pathname === "/api/projects/p1") {
      return sendJson(response, 200, useMemory ? memoryBoard().project : (await query("SELECT id, name, description FROM projects WHERE id = 'p1'")).rows[0]);
    }
    if (request.method === "PATCH" && url.pathname === "/api/projects/p1") {
      const input = await readJson(request);
      if (!input.name?.trim()) return sendJson(response, 400, { error: "A project name is required" });
      if (useMemory) return sendJson(response, 200, { id: "p1", name: input.name.trim(), description: input.description ?? "" });
      const result = await query("UPDATE projects SET name = $1, description = $2 WHERE id = 'p1' RETURNING id, name, description", [input.name.trim(), input.description ?? ""]);
      return sendJson(response, result.rowCount ? 200 : 404, result.rows[0] ?? { error: "Project not found" });
    }
    if (request.method === "POST" && url.pathname === "/api/tasks") { const input = await readJson(request); const error = validate(input); if (error) return sendJson(response, 400, { error }); return sendJson(response, 201, await createTask(input)); }
    const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (taskMatch && ["PATCH", "DELETE"].includes(request.method)) {
      const id = taskMatch[1]; const input = request.method === "PATCH" ? await readJson(request) : {};
      if (request.method === "PATCH" && input.status && !statuses.has(input.status)) return sendJson(response, 400, { error: "Invalid status" });
      if (useMemory) { const index = tasks.findIndex((task) => task.id === id); if (index < 0) return sendJson(response, 404, { error: "Task not found" }); if (request.method === "DELETE") tasks.splice(index, 1); else tasks[index] = { ...tasks[index], ...input }; return sendJson(response, request.method === "DELETE" ? 204 : 200, request.method === "DELETE" ? null : tasks[index]); }
      if (request.method === "DELETE") { const result = await query("DELETE FROM tasks WHERE id = $1", [id]); return sendJson(response, result.rowCount ? 204 : 404, result.rowCount ? null : { error: "Task not found" }); }
      const result = await query("UPDATE tasks SET title = COALESCE($2, title), description = COALESCE($3, description), priority = COALESCE($4, priority), due_date = COALESCE($5, due_date), status = COALESCE($6, status), assignee_id = COALESCE($7, assignee_id) WHERE id = $1 RETURNING id, title, description, priority, TO_CHAR(due_date, 'YYYY-MM-DD') AS \"dueDate\", status, assignee_id AS \"assigneeId\"", [id, input.title?.trim(), input.description, input.priority, input.dueDate, input.status, input.assigneeId]);
      return sendJson(response, result.rowCount ? 200 : 404, result.rows[0] ?? { error: "Task not found" });
    }
    if (request.method === "POST" && url.pathname === "/api/members") {
      const input = await readJson(request); if (!input.name?.trim()) return sendJson(response, 400, { error: "A member name is required" });
      const user = { id: `u${Date.now()}`, name: input.name.trim(), initials: input.name.trim()[0].toUpperCase(), color: "#0f766e", role: "MEMBER" };
      if (useMemory) users.push(user); else { await query("INSERT INTO users (id, name, initials, color) VALUES ($1, $2, $3, $4)", [user.id, user.name, user.initials, user.color]); await query("INSERT INTO project_members (project_id, user_id) VALUES ('p1', $1)", [user.id]); }
      return sendJson(response, 201, user);
    }
    if (request.method === "DELETE" && url.pathname.startsWith("/api/members/")) {
      const id = url.pathname.split("/").pop();
      if (id === "u1") return sendJson(response, 403, { error: "Project owner cannot be removed" });
      if (useMemory) { const index = users.findIndex((user) => user.id === id); if (index >= 0) users.splice(index, 1); return sendJson(response, index >= 0 ? 204 : 404, index >= 0 ? null : { error: "Member not found" }); }
      const result = await query("DELETE FROM project_members WHERE project_id = 'p1' AND user_id = $1", [id]);
      return sendJson(response, result.rowCount ? 204 : 404, result.rowCount ? null : { error: "Member not found" });
    }
    if (url.pathname.startsWith("/api/")) return sendJson(response, 404, { error: "Not found" });
    return serveFile(request, response);
  } catch (error) { console.error(error); sendJson(response, 500, { error: "Request failed" }); }
});

if (useMemory) server.listen(port, () => console.log(`Task management app listening on http://localhost:${port}`));
else initializeDatabase().then(() => server.listen(port, () => console.log(`Task management app listening on http://localhost:${port}`))).catch((error) => { console.error("Database initialization failed", error); process.exitCode = 1; });
