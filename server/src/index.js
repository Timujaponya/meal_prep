import cors from "cors";
import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
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

app.listen(port, () => {
  console.log(`Meal Prep API listening on http://localhost:${port}`);
});
