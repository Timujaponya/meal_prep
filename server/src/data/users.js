import { Pool } from "pg";
import crypto from "crypto";

const DATABASE_URL = process.env.DATABASE_URL;
const useDatabase = Boolean(DATABASE_URL);

const seedAdminUser = {
  id: "admin_1",
  email: "admin@mealforge.local",
  password: "admin123",
  role: "admin",
  displayName: "Meal Forge Admin",
  avatarUrl: ""
};

let pool;
let memoryUsers = [seedAdminUser];

function getPool() {
  if (!useDatabase) {
    return null;
  }

  if (!pool) {
    const needsSsl = process.env.PGSSLMODE === "require";
    pool = new Pool({
      connectionString: DATABASE_URL,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined
    });
  }

  return pool;
}

function fromRow(row) {
  return {
    id: row.id,
    email: row.email,
    password: row.password,
    role: row.role,
    displayName: row.display_name,
    avatarUrl: row.avatar_url || ""
  };
}

export function toPublicUser(user) {
  return {
    id: user.id,
    email: user.email,
    role: user.role,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl || ""
  };
}

export async function initializeUserStore() {
  if (!useDatabase) {
    return;
  }

  const db = getPool();
  await db.query(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      display_name TEXT NOT NULL,
      avatar_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  await db.query(
    `
    INSERT INTO users (id, email, password, role, display_name, avatar_url)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (id) DO NOTHING
    `,
    [
      seedAdminUser.id,
      seedAdminUser.email,
      seedAdminUser.password,
      seedAdminUser.role,
      seedAdminUser.displayName,
      seedAdminUser.avatarUrl
    ]
  );
}

export async function findUserByEmail(email) {
  const normalized = String(email || "").trim().toLowerCase();
  if (!normalized) {
    return null;
  }

  if (!useDatabase) {
    return memoryUsers.find((user) => user.email.toLowerCase() === normalized) || null;
  }

  const db = getPool();
  const result = await db.query("SELECT * FROM users WHERE email = $1 LIMIT 1", [normalized]);
  return result.rowCount ? fromRow(result.rows[0]) : null;
}

export async function findUserById(userId) {
  const normalized = String(userId || "").trim();
  if (!normalized) {
    return null;
  }

  if (!useDatabase) {
    return memoryUsers.find((user) => user.id === normalized) || null;
  }

  const db = getPool();
  const result = await db.query("SELECT * FROM users WHERE id = $1 LIMIT 1", [normalized]);
  return result.rowCount ? fromRow(result.rows[0]) : null;
}

export async function createUser({ email, password, displayName }) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const normalizedPassword = String(password || "").trim();
  const normalizedName = String(displayName || "").trim();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    throw new Error("Gecerli bir email girin.");
  }

  if (normalizedPassword.length < 4) {
    throw new Error("Sifre en az 4 karakter olmali.");
  }

  const nextUser = {
    id: `user_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
    email: normalizedEmail,
    password: normalizedPassword,
    role: "user",
    displayName: normalizedName || normalizedEmail.split("@")[0],
    avatarUrl: ""
  };

  if (!useDatabase) {
    const exists = memoryUsers.some((item) => item.email.toLowerCase() === normalizedEmail);
    if (exists) {
      throw new Error("Bu email zaten kayitli.");
    }

    memoryUsers.push(nextUser);
    return nextUser;
  }

  const db = getPool();
  const exists = await db.query("SELECT id FROM users WHERE email = $1 LIMIT 1", [normalizedEmail]);
  if (exists.rowCount) {
    throw new Error("Bu email zaten kayitli.");
  }

  const result = await db.query(
    `
    INSERT INTO users (id, email, password, role, display_name, avatar_url)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *
    `,
    [nextUser.id, nextUser.email, nextUser.password, nextUser.role, nextUser.displayName, nextUser.avatarUrl]
  );

  return fromRow(result.rows[0]);
}

export async function closeUserStore() {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}