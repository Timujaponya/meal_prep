import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { closeDashboardMealStore, initializeDashboardMealStore } from "./data/dashboardMeals.js";
import { closeFoodStore, initializeFoodStore, isDatabaseEnabled } from "./data/foods.js";
import { closeInventoryStore, initializeInventoryStore } from "./data/inventory.js";
import { closeTrackerStore, initializeTrackerStore } from "./data/tracker.js";
import { closeUserStore, initializeUserStore } from "./data/users.js";
import { authRouter } from "./routes/auth.js";
import { planRouter } from "./routes/plan.js";

const app = express();
const port = Number(process.env.PORT || 4000);
const currentFilePath = fileURLToPath(import.meta.url);
const serverSrcDir = path.dirname(currentFilePath);
const projectRootPath = path.resolve(serverSrcDir, "../..");
const clientDistPath = path.join(projectRootPath, "client", "dist");
const clientIndexPath = path.join(clientDistPath, "index.html");

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api", authRouter);
app.use("/api", planRouter);

if (fs.existsSync(clientIndexPath)) {
  app.use(express.static(clientDistPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/api")) {
      next();
      return;
    }

    res.sendFile(clientIndexPath);
  });
}

async function start() {
  await initializeUserStore();
  await initializeFoodStore();
  await initializeDashboardMealStore();
  await initializeInventoryStore();
  await initializeTrackerStore();

  app.listen(port, () => {
    const mode = isDatabaseEnabled() ? "PostgreSQL" : "memory";
    console.log(`Meal Prep API listening on http://localhost:${port} (${mode} mode)`);
  });
}

start().catch((error) => {
  console.error("Server startup failed:", error);
  process.exit(1);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, async () => {
    await closeUserStore();
    await closeFoodStore();
    await closeDashboardMealStore();
    await closeInventoryStore();
    await closeTrackerStore();
    process.exit(0);
  });
}
