import { db } from "@/lib/db";
import type { CreditKind, CreditOrigin, SessionType } from "@prisma/client";

let teller = 0;
function uniek(prefix: string) {
  teller += 1;
  return `${prefix}-${teller}-${Date.now()}`;
}

export function urenVanaf(uren: number, vanaf: Date = new Date()): Date {
  return new Date(vanaf.getTime() + uren * 60 * 60 * 1000);
}

export function dagenVanaf(dagen: number, vanaf: Date = new Date()): Date {
  return urenVanaf(dagen * 24, vanaf);
}

export async function maakLid(overrides: Partial<Parameters<typeof db.user.create>[0]["data"]> = {}) {
  return db.user.create({
    data: { role: "MEMBER", firstName: "Test", lastName: uniek("Klant"), ...overrides },
  });
}

export async function maakTrainer(overrides: Partial<Parameters<typeof db.user.create>[0]["data"]> = {}) {
  return db.user.create({
    data: { role: "TRAINER", firstName: "Coach", lastName: uniek("Trainer"), ...overrides },
  });
}

export async function maakActivity(type: SessionType, overrides: Partial<Parameters<typeof db.activity.create>[0]["data"]> = {}) {
  return db.activity.create({
    data: { name: uniek("Activiteit"), type, minutes: 60, capacity: 8, ...overrides },
  });
}

export async function maakSessie(params: {
  trainerId: string;
  activityId: string;
  type: SessionType;
  startsAt: Date;
  capacity?: number;
  minutes?: number;
}) {
  return db.session.create({
    data: {
      trainerId: params.trainerId,
      activityId: params.activityId,
      type: params.type,
      startsAt: params.startsAt,
      minutes: params.minutes ?? 60,
      capacity: params.capacity ?? 8,
    },
  });
}

export async function geefCredit(params: {
  userId: string;
  kind: CreditKind;
  validFrom: Date;
  validUntil: Date;
  origin?: CreditOrigin;
}) {
  return db.credit.create({
    data: {
      userId: params.userId,
      kind: params.kind,
      origin: params.origin ?? "PERIODIEK",
      validFrom: params.validFrom,
      validUntil: params.validUntil,
    },
  });
}

export async function maakRittenkaart(params: {
  userId: string;
  total: number;
  used?: number;
  perSession?: number;
  validUntil: Date;
}) {
  return db.rittenkaart.create({
    data: {
      userId: params.userId,
      total: params.total,
      used: params.used ?? 0,
      perSession: params.perSession ?? 1,
      validUntil: params.validUntil,
    },
  });
}
