const app = require("./app");
const env = require("./config/env");
const { connectDatabase } = require("./config/database");
const { bootstrapSystem } = require("./services/bootstrapService");
const { initScoringQueue, closeScoringQueue } = require("./services/scoringQueueService");

let server;

const start = async () => {
  await connectDatabase();
  await bootstrapSystem();
  initScoringQueue();

  server = app.listen(env.PORT, () => {
    console.log(`[server] running on port ${env.PORT}`);
  });
};

const shutdown = async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  await closeScoringQueue();
  process.exit(0);
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

start().catch((error) => {
  console.error("[server] startup failed", error);
  process.exit(1);
});