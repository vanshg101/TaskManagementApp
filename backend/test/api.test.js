import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { fileURLToPath } from "node:url";
import { test, before, after } from "node:test";

const port = 3100 + Math.floor(Math.random() * 500);
const baseUrl = `http://127.0.0.1:${port}`;
let serverProcess;

async function request(path, options) {
  const response = await fetch(`${baseUrl}${path}`, options);
  const body = response.status === 204 ? null : await response.json();
  return { response, body };
}

before(async () => {
  serverProcess = spawn(process.execPath, ["src/server.js"], {
    cwd: fileURLToPath(new URL("..", import.meta.url)),
    env: { ...process.env, PORT: String(port) },
    stdio: "ignore"
  });
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Server did not start")), 5000);
    const check = async () => {
      try {
        const result = await fetch(`${baseUrl}/api/health`);
        if (result.ok) {
          clearTimeout(timer);
          resolve();
        } else {
          setTimeout(check, 50);
        }
      } catch {
        setTimeout(check, 50);
      }
    };
    check();
  });
});

after(async () => {
  serverProcess.kill();
  await once(serverProcess, "close");
});

test("serves health and seeded board data", async () => {
  const health = await request("/api/health");
  assert.equal(health.body.status, "ok");

  const board = await request("/api/board");
  assert.equal(board.body.tasks.length, 3);
  assert.deepEqual(board.body.counts, { TODO: 1, IN_PROGRESS: 1, DONE: 1 });
});

test("validates and persists task creation and status changes", async () => {
  const invalid = await request("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "", priority: "HIGH" })
  });
  assert.equal(invalid.response.status, 400);

  const created = await request("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Ship MVP", priority: "HIGH", assigneeId: "u1" })
  });
  assert.equal(created.response.status, 201);

  const updated = await request(`/api/tasks/${created.body.id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "IN_PROGRESS" })
  });
  assert.equal(updated.body.status, "IN_PROGRESS");

  const board = await request("/api/board");
  assert.equal(board.body.counts.IN_PROGRESS, 2);
});

test("calculates overloaded users when more than five tasks are in progress", async () => {
  for (let index = 0; index < 5; index += 1) {
    const result = await request("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: `Work item ${index}`, status: "IN_PROGRESS", assigneeId: "u1" })
    });
    assert.equal(result.response.status, 201);
  }

  const board = await request("/api/board");
  const user = board.body.users.find((item) => item.id === "u1");
  assert.equal(user.inProgressTaskCount, 6);
  assert.equal(user.overloaded, true);
});

test("deletes tasks and creates members", async () => {
  const createdTask = await request("/api/tasks", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title: "Temporary task" })
  });
  const deleted = await request(`/api/tasks/${createdTask.body.id}`, { method: "DELETE" });
  assert.equal(deleted.response.status, 204);

  const member = await request("/api/members", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "Neha" })
  });
  assert.equal(member.response.status, 201);
  assert.equal(member.body.name, "Neha");
});
