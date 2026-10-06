import pg from "pg";

const { Pool } = pg;
const databaseUrl = process.env.DATABASE_URL ?? "postgresql://taskapp:taskapp@localhost:5432/task_management";
const pool = new Pool({ connectionString: databaseUrl });

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, initials TEXT NOT NULL,
      color TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'MEMBER'
        CHECK (role IN ('OWNER', 'MEMBER'))
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT ''
    );
    CREATE TABLE IF NOT EXISTS project_members (
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      PRIMARY KEY (project_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY, project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      title TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
      due_date DATE, status TEXT NOT NULL CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE')),
      assignee_id TEXT REFERENCES users(id) ON DELETE SET NULL
    );
  `);
  const existing = await pool.query("SELECT id FROM projects WHERE id = 'p1'");
  if (existing.rowCount === 0) {
    await pool.query("INSERT INTO projects (id, name, description) VALUES ('p1', 'My Task Board', 'A simple team task board.')");
    await pool.query("INSERT INTO users (id, name, initials, color, role) VALUES ('u1', 'Aarav', 'A', '#2563eb', 'OWNER'), ('u2', 'Riya', 'R', '#9333ea', 'MEMBER')");
    await pool.query("INSERT INTO project_members (project_id, user_id) VALUES ('p1', 'u1'), ('p1', 'u2')");
    await pool.query(`
      INSERT INTO tasks (id, project_id, title, description, priority, due_date, status, assignee_id)
      VALUES ('t1', 'p1', 'Plan the first sprint', 'Break the project into small deliverables.', 'HIGH', '2026-10-10', 'TODO', 'u1'),
             ('t2', 'p1', 'Create board layout', 'Build the three-column board.', 'MEDIUM', '2026-10-08', 'IN_PROGRESS', 'u2'),
             ('t3', 'p1', 'Write project notes', 'Document the setup and decisions.', 'LOW', '2026-10-07', 'DONE', 'u1')
    `);
  }
}

export async function query(text, values) {
  return pool.query(text, values);
}

export async function closeDatabase() {
  await pool.end();
}
