import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);
const publicDirectory = fileURLToPath(new URL("../../public/", import.meta.url));
const statuses = new Set(["TODO", "IN_PROGRESS", "DONE"]);
const priorities = new Set(["LOW", "MEDIUM", "HIGH"]);

const users = [
  { id: "u1", name: "Aarav", initials: "A", color: "#2563eb" },
  { id: "u2", name: "Riya", initials: "R", color: "#9333ea" }
];

const tasks = [
  { id: "t1", title: "Plan the first sprint", description: "Break the project into small deliverables.", priority: "HIGH", dueDate: "2026-10-10", status: "TODO", assigneeId: "u1" },
  { id: "t2", title: "Create board layout", description: "Build the three-column board.", priority: "MEDIUM", dueDate: "2026-10-08", status: "IN_PROGRESS", assigneeId: "u2" },
  { id: "t3", title: "Write project notes", description: "Document the setup and decisions.", priority: "LOW", dueDate: "2026-10-07", status: "DONE", assigneeId: "u1" }
];

function sendJson(response, status, body) {
  response.writeHead(status, { "Content-Type": "application/json" });
  response.end(JSON.stringify(body));
}

async function readJson(request) {
  let body = "";
  for await (const chunk of request) body += chunk;
  return body ? JSON.parse(body) : {};
}

function board() {
  const workload = users.map((user) => {
    const inProgressTaskCount = tasks.filter((task) => task.assigneeId === user.id && task.status === "IN_PROGRESS").length;
    return { ...user, inProgressTaskCount, overloaded: inProgressTaskCount > 5 };
  });
  return {
    project: { id: "p1", name: "My Task Board", description: "A simple team task board." },
    users: workload,
    tasks,
    counts: {
      TODO: tasks.filter((task) => task.status === "TODO").length,
      IN_PROGRESS: tasks.filter((task) => task.status === "IN_PROGRESS").length,
      DONE: tasks.filter((task) => task.status === "DONE").length
    }
  };
}

function validateTask(input) {
  if (!input.title || typeof input.title !== "string" || !input.title.trim()) return "A task title is required";
  if (input.priority && !priorities.has(input.priority)) return "Invalid priority";
  if (input.status && !statuses.has(input.status)) return "Invalid status";
  if (input.assigneeId && !users.some((user) => user.id === input.assigneeId)) return "Invalid assignee";
  return null;
}

async function serveFile(request, response) {
  const requested = request.url === "/" ? "index.html" : request.url.slice(1);
  const filePath = path.resolve(publicDirectory, requested);
  if (!filePath.startsWith(path.resolve(publicDirectory))) return sendJson(response, 403, { error: "Forbidden" });
  try {
    const content = await readFile(filePath);
    const type = filePath.endsWith(".css") ? "text/css" : filePath.endsWith(".js") ? "text/javascript" : "text/html";
    response.writeHead(200, { "Content-Type": type });
    response.end(content);
  } catch {
    sendJson(response, 404, { error: "Not found" });
  }
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url, `http://${request.headers.host}`);
  try {
    if (request.method === "GET" && url.pathname === "/api/health") return sendJson(response, 200, { status: "ok" });
    if (request.method === "GET" && url.pathname === "/api/board") return sendJson(response, 200, board());
    if (request.method === "POST" && url.pathname === "/api/tasks") {
      const input = await readJson(request);
      const error = validateTask(input);
      if (error) return sendJson(response, 400, { error });
      const task = { id: `t${Date.now()}`, title: input.title.trim(), description: input.description ?? "", priority: input.priority ?? "MEDIUM", dueDate: input.dueDate ?? "", status: input.status ?? "TODO", assigneeId: input.assigneeId ?? null };
      tasks.push(task);
      return sendJson(response, 201, task);
    }
    const taskMatch = url.pathname.match(/^\/api\/tasks\/([^/]+)$/);
    if (taskMatch && ["PATCH", "DELETE"].includes(request.method)) {
      const index = tasks.findIndex((task) => task.id === taskMatch[1]);
      if (index < 0) return sendJson(response, 404, { error: "Task not found" });
      if (request.method === "DELETE") {
        tasks.splice(index, 1);
        return sendJson(response, 204, {});
      }
      const input = await readJson(request);
      const error = validateTask({ ...tasks[index], ...input });
      if (error) return sendJson(response, 400, { error });
      tasks[index] = { ...tasks[index], ...input, title: input.title?.trim() ?? tasks[index].title };
      return sendJson(response, 200, tasks[index]);
    }
    if (request.method === "POST" && url.pathname === "/api/members") {
      const input = await readJson(request);
      if (!input.name?.trim()) return sendJson(response, 400, { error: "A member name is required" });
      const user = { id: `u${Date.now()}`, name: input.name.trim(), initials: input.name.trim()[0].toUpperCase(), color: "#0f766e", inProgressTaskCount: 0, overloaded: false };
      users.push(user);
      return sendJson(response, 201, user);
    }
    if (url.pathname.startsWith("/api/")) return sendJson(response, 404, { error: "Not found" });
    return serveFile(request, response);
  } catch (error) {
    sendJson(response, 400, { error: error instanceof SyntaxError ? "Invalid JSON" : "Request failed" });
  }
});

server.listen(port, () => console.log(`Task management app listening on http://localhost:${port}`));
