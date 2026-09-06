// Draait vóór elk testbestand: prikt de Prisma-client op de losse
// testdatabase (nooit dev.db) en maakt de tabellen leeg voor elke test.
// Let op: sqlite file:-URLs zijn relatief aan de map van schema.prisma
// (prisma/), niet aan de working directory — dus "./test.db" hier, niet
// "./prisma/test.db" (dat zou prisma/prisma/test.db opleveren).
process.env.DATABASE_URL = "file:./test.db";

import { beforeEach } from "vitest";
import { db } from "@/lib/db";

async function resetDb() {
  await db.$transaction([
    db.booking.deleteMany(),
    db.credit.deleteMany(),
    db.rittenkaart.deleteMany(),
    db.leadNote.deleteMany(),
    db.lead.deleteMany(),
    db.traject.deleteMany(),
    db.note.deleteMany(),
    db.message.deleteMany(),
    db.thread.deleteMany(),
    db.invoiceLine.deleteMany(),
    db.invoice.deleteMany(),
    db.subscription.deleteMany(),
    db.session.deleteMany(),
    db.sessionTemplate.deleteMany(),
    db.trainerAvailability.deleteMany(),
    db.activity.deleteMany(),
    db.importIssue.deleteMany(),
    db.user.deleteMany(),
    db.product.deleteMany(),
    db.setting.deleteMany(),
  ]);
}

beforeEach(async () => {
  await resetDb();
});
