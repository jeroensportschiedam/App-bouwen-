// Draait één keer voor de hele testrun: zet de losse testdatabase neer met
// het actuele schema, zodat tests nooit de ontwikkeldatabase raken.
import { execSync } from "node:child_process";
import { existsSync, rmSync } from "node:fs";
import path from "node:path";

const testDb = path.resolve(__dirname, "../prisma/test.db");

export default function globalSetup() {
  if (existsSync(testDb)) rmSync(testDb);

  execSync("npx prisma db push --skip-generate", {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, DATABASE_URL: "file:./test.db" }, // relatief aan prisma/schema.prisma
    stdio: "inherit",
  });
}
