import { config } from "./config";
import express from "express";
import { getCalendarClient } from "./calendar";
import path from "path";
import { runAgent } from "./agent";

const app = express();
app.use(express.json());
app.use(express.static(path.join(process.cwd(), "public")));

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/chat", async (req, res) => {
  const message = req.body?.message;
  if (!message) {
    res.status(400).json({ error: "Missing 'message' in request body." });
    return;
  }

  try {
    const history = Array.isArray(req.body?.history) ? req.body.history : [];
    const reply = await runAgent(message, req.body?.timezone, history);
    res.json({ message, reply });
  } catch (err) {
    const error = err instanceof Error ? err.message : "Request failed";
    res.status(500).json({ error });
  }
});

async function main() {
  await getCalendarClient();
  app.listen(config.port, () => {
    console.log(`AI Calendar Agent running at http://localhost:${config.port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
