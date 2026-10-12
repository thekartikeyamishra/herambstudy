/**
 * Firestore security-rules tests. Requires the Firestore emulator (Java 11+):
 *   npm run test:rules
 * Verifies that browsers (signed-in or not) can never read or write any collection.
 */
import { readFileSync } from "node:fs";
import {
  assertFails,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { collection, doc, getDoc, getDocs, setDoc, deleteDoc } from "firebase/firestore";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let env: RulesTestEnvironment;

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-heramb",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
  });
});
afterAll(async () => env?.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  // Seed a record as the server would (rules bypassed).
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "inviteRequests/abc"), { normalizedEmail: "someone@example.com", status: "pending" });
  });
});

const collections = ["inviteRequests", "contactMessages", "pilotApplications", "rateLimits", "anythingElse"];

describe.each([
  ["unauthenticated visitor", () => env.unauthenticatedContext()],
  ["signed-in user", () => env.authenticatedContext("user-1", { email: "someone@example.com" })],
  ["user claiming admin", () => env.authenticatedContext("user-2", { admin: true })],
])("%s", (_label, ctx) => {
  it("cannot list or read invite requests", async () => {
    const db = ctx().firestore();
    await assertFails(getDocs(collection(db, "inviteRequests")));
    await assertFails(getDoc(doc(db, "inviteRequests/abc")));
  });

  it.each(collections)("cannot write to %s", async (name) => {
    const db = ctx().firestore();
    await assertFails(setDoc(doc(db, `${name}/x`), { status: "invited" }));
  });

  it("cannot modify or delete an existing invite request", async () => {
    const db = ctx().firestore();
    await assertFails(setDoc(doc(db, "inviteRequests/abc"), { status: "invited" }, { merge: true }));
    await assertFails(deleteDoc(doc(db, "inviteRequests/abc")));
  });
});
