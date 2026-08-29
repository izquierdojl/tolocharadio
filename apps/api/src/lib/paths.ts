import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";

export function packageRoot(fromFile: string): string {
  let dir = dirname(fromFile);
  while (!existsSync(resolve(dir, "package.json"))) {
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return dir;
}