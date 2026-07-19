import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, resolve, sep } from "node:path";

const root = resolve(process.cwd(), "out");
const portIndex = process.argv.indexOf("--port");
const port = Number(portIndex >= 0 ? process.argv[portIndex + 1] : 3200);
const mime = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".ico": "image/x-icon", ".woff2": "font/woff2" };

async function fileFor(pathname) {
  const decoded = decodeURIComponent(pathname).replace(/\0/g, "");
  const candidates = decoded.endsWith("/") ? [`${decoded}index.html`] : extname(decoded) ? [decoded] : [`${decoded}/index.html`, `${decoded}.html`];
  for (const candidate of candidates) {
    const path = resolve(root, `.${candidate}`);
    if (path !== root && !path.startsWith(`${root}${sep}`)) continue;
    try { if ((await stat(path)).isFile()) return path; } catch { /* try next candidate */ }
  }
  return resolve(root, "404.html");
}

createServer(async (request, response) => {
  try {
    const path = await fileFor(new URL(request.url ?? "/", `http://${request.headers.host ?? "localhost"}`).pathname);
    response.statusCode = path.endsWith("404.html") ? 404 : 200;
    response.setHeader("content-type", mime[extname(path)] ?? "application/octet-stream");
    createReadStream(path).pipe(response);
  } catch {
    response.statusCode = 500;
    response.end("Internal server error");
  }
}).listen(port, "127.0.0.1", () => console.log(`Static preview: http://127.0.0.1:${port}`));
