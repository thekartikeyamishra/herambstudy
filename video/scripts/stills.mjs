// Renders preview stills: node scripts/stills.mjs <outDir> <composition> <frame,frame,...>
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import path from "node:path";
const [out, compId, frames] = process.argv.slice(2);
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const browserExecutable = process.env.REMOTION_BROWSER || null;
for (const id of compId.split(",")) {
  const composition = await selectComposition({ serveUrl, id, browserExecutable });
  for (const f of frames.split(",").map(Number)) {
    await renderStill({ composition, serveUrl, frame: f, output: path.join(out, `${id}-${f}.jpg`), imageFormat: "jpeg", jpegQuality: 85, browserExecutable });
    console.log(id, f);
  }
}
