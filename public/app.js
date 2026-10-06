const columns = [{ id: "TODO", label: "To-Do" }, { id: "IN_PROGRESS", label: "In Progress" }, { id: "DONE", label: "Done" }];
let state = { tasks: [], users: [], counts: {} };
const $ = (id) => document.getElementById(id);

async function request(url, options) {
  const response = await fetch(url, { headers: { "Content-Type": "application/json" }, ...options });
  if (!response.ok) throw new Error((await response.json()).error || "Request failed");
  return response.status === 204 ? null : response.json();
}
async function load() {
  state = await request("/api/board");
  render();
}
function render() {
  const filter = $("priority-filter").value;
  $("board").innerHTML = columns.map((column) => {
    const tasks = state.tasks.filter((task) => task.status === column.id && (filter === "ALL" || task.priority === filter));
    return `<article class="column" data-status="${column.id}"><div class="column-heading"><h2>${column.label}</h2><span class="count">${state.counts[column.id]}</span></div><div class="tasks">${tasks.map(taskCard).join("")}</div></article>`;
  }).join("");
  document.querySelectorAll(".column").forEach((column) => {
    column.addEventListener("dragover", (event) => { event.preventDefault(); column.classList.add("over"); });
    column.addEventListener("dragleave", () => column.classList.remove("over"));
    column.addEventListener("drop", async (event) => {
      event.preventDefault(); column.classList.remove("over");
      try { await request(`/api/tasks/${event.dataTransfer.getData("taskId")}`, { method: "PATCH", body: JSON.stringify({ status: column.dataset.status }) }); await load(); } catch (error) { show(error.message); }
    });
  });
  document.querySelectorAll("[data-edit]").forEach((button) => button.addEventListener("click", () => openTask(button.dataset.edit)));
  $("team").innerHTML = state.users.map((user) => `<div class="member"><span class="avatar ${user.overloaded ? "overloaded" : ""}" style="background:${user.color}" title="${user.inProgressTaskCount} in-progress tasks">${user.initials}</span><span><strong>${user.name}</strong><br><small>${user.inProgressTaskCount} in progress${user.overloaded ? " · overloaded" : ""}</small></span></div>`).join("");
}
function taskCard(task) {
  return `<div class="task" draggable="true" ondragstart="event.dataTransfer.setData('taskId','${task.id}')"><h3>${escapeHtml(task.title)}</h3><p>${escapeHtml(task.description)}</p><div class="task-footer"><span class="badge ${task.priority}">${task.priority}</span><span>${task.dueDate || "No due date"}</span><button data-edit="${task.id}" aria-label="Edit ${escapeHtml(task.title)}">Edit</button></div></div>`;
}
function escapeHtml(value) { return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character])); }
function openTask(id) {
  const task = state.tasks.find((item) => item.id === id);
  $("dialog-title").textContent = task ? "Edit task" : "New task";
  $("delete-task").hidden = !task;
  $("task-id").value = task?.id || ""; $("title").value = task?.title || ""; $("description").value = task?.description || ""; $("priority").value = task?.priority || "MEDIUM"; $("due-date").value = task?.dueDate || "";
  $("assignee").innerHTML = `<option value="">Unassigned</option>${state.users.map((user) => `<option value="${user.id}" ${user.id === task?.assigneeId ? "selected" : ""}>${user.name}</option>`).join("")}`;
  $("task-dialog").showModal();
}
function show(message) { $("message").textContent = message; setTimeout(() => $("message").textContent = "", 3000); }
$("new-task").addEventListener("click", () => openTask());
$("cancel").addEventListener("click", () => $("task-dialog").close());
$("priority-filter").addEventListener("change", render);
$("delete-task").addEventListener("click", async () => {
  const id = $("task-id").value;
  if (!id || !confirm("Delete this task?")) return;
  try { await request(`/api/tasks/${id}`, { method: "DELETE" }); $("task-dialog").close(); await load(); } catch (error) { show(error.message); }
});
$("add-member").addEventListener("click", async () => {
  const name = prompt("Member name");
  if (!name?.trim()) return;
  try { await request("/api/members", { method: "POST", body: JSON.stringify({ name }) }); await load(); } catch (error) { show(error.message); }
});
$("task-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const id = $("task-id").value;
  const data = { title: $("title").value, description: $("description").value, priority: $("priority").value, dueDate: $("due-date").value, assigneeId: $("assignee").value || null };
  try { await request(id ? `/api/tasks/${id}` : "/api/tasks", { method: id ? "PATCH" : "POST", body: JSON.stringify(data) }); $("task-dialog").close(); await load(); } catch (error) { show(error.message); }
});
load().catch((error) => show(error.message));
