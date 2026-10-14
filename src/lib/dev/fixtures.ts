import { readdirSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

/** Test fixtures live in /test-fixtures (never in /public, so they are never deployed). */
export const FIXTURES_DIR = join(process.cwd(), "test-fixtures");

export type FixtureFile = { path: string; bytes: number };

export function listFixtures(dir = FIXTURES_DIR): FixtureFile[] {
  const out: FixtureFile[] = [];
  const walk = (d: string) => {
    let entries: string[];
    try {
      entries = readdirSync(d);
    } catch {
      return;
    }
    for (const name of entries.sort()) {
      const full = join(d, name);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else out.push({ path: relative(dir, full).split(sep).join("/"), bytes: st.size });
    }
  };
  walk(dir);
  return out;
}

/** Only plain relative paths made of safe characters; blocks traversal like ../ or absolute paths. */
export function safeFixturePath(input: string): string | null {
  if (!/^[A-Za-z0-9._-]+(\/[A-Za-z0-9._-]+)*$/.test(input)) return null;
  if (input.split("/").some((part) => part === ".." || part === ".")) return null;
  return input;
}
