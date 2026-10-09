import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".ico": "image/x-icon",
  ".ics": "text/calendar; charset=utf-8",
  ".mp4": "video/mp4",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".xml": "application/xml; charset=utf-8",
  ".txt": "text/plain; charset=utf-8"
};

const LIVERELOAD_CLIENT = `
<script>
(() => {
  const es = new EventSource('/__livereload');
  es.onmessage = (e) => {
    if (e.data === 'reload') {
      console.log('[dev-server] File change detected, reloading...');
      window.location.reload();
    }
  };
  es.onerror = () => {
    setTimeout(() => {
      // Reconnection handled automatically by EventSource
    }, 2000);
  };
})();
</script>
`;

const clients = new Set();

// Watch root directory and subdirectories for changes
let reloadTimeout = null;
function broadcastReload() {
  if (reloadTimeout) clearTimeout(reloadTimeout);
  reloadTimeout = setTimeout(() => {
    for (const res of clients) {
      try {
        res.write("data: reload\n\n");
      } catch {
        clients.delete(res);
      }
    }
  }, 100);
}

try {
  fs.watch(__dirname, { recursive: true }, (_eventType, filename) => {
    if (!filename) return;
    if (
      filename.includes(".git") ||
      filename.includes("node_modules") ||
      filename.endsWith("~") ||
      filename.startsWith(".")
    ) {
      return;
    }
    broadcastReload();
  });
} catch (err) {
  console.warn("[dev-server] File watch fallback:", err.message);
}

function resolveFilePath(reqPath) {
  let decoded = decodeURIComponent(reqPath.split("?")[0].split("#")[0]);
  let clean = path.normalize(decoded).replace(/^(\.\.[/\\])+/, "");
  if (clean.startsWith("/")) clean = clean.slice(1);

  let target = path.join(__dirname, clean);

  if (fs.existsSync(target) && fs.statSync(target).isDirectory()) {
    const indexPath = path.join(target, "index.html");
    if (fs.existsSync(indexPath)) return indexPath;
  }

  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    return target;
  }

  // Try appending .html
  if (fs.existsSync(target + ".html")) {
    return target + ".html";
  }

  // Try folder/index.html
  const folderIndex = path.join(target, "index.html");
  if (fs.existsSync(folderIndex)) {
    return folderIndex;
  }

  return null;
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);

  // Live reload SSE endpoint
  if (url.pathname === "/__livereload") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*"
    });
    res.write("data: connected\n\n");
    clients.add(res);
    req.on("close", () => clients.delete(res));
    return;
  }

  const filePath = resolveFilePath(url.pathname);
  if (!filePath) {
    res.writeHead(404, { "Content-Type": "text/html; charset=utf-8" });
    res.end(`<!doctype html><h1>404 — Página não encontrada</h1><p><a href="/">Voltar ao início</a></p>`);
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || "application/octet-stream";
  const stat = fs.statSync(filePath);

  // Video streaming with Range support
  if (ext === ".mp4" && req.headers.range) {
    const range = req.headers.range;
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : stat.size - 1;
    const chunksize = end - start + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${stat.size}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": contentType
    });
    file.pipe(res);
    return;
  }

  if (ext === ".html") {
    let content = fs.readFileSync(filePath, "utf-8");
    if (content.includes("</body>")) {
      content = content.replace("</body>", `${LIVERELOAD_CLIENT}</body>`);
    } else {
      content += LIVERELOAD_CLIENT;
    }
    res.writeHead(200, {
      "Content-Type": contentType,
      "Content-Length": Buffer.byteLength(content)
    });
    res.end(content);
    return;
  }

  res.writeHead(200, {
    "Content-Type": contentType,
    "Content-Length": stat.size,
    "Accept-Ranges": "bytes"
  });
  fs.createReadStream(filePath).pipe(res);
});

function startServer(port = 3000) {
  server.listen(port, () => {
    console.log(`\n🎉 Servidor de preview local rodando!`);
    console.log(`   ➜ Site principal:  http://localhost:${port}/`);
    console.log(`   ➜ Congressinho:    http://localhost:${port}/infantil/`);
    console.log(`   ➜ Live-reload:     ativo (salvou qualquer arquivo, a página atualiza)\n`);
  });

  server.on("error", (err) => {
    if (err.code === "EADDRINUSE") {
      console.log(`[dev-server] Porta ${port} em uso, tentando porta ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error("[dev-server] Erro no servidor:", err);
    }
  });
}

startServer(Number(process.env.PORT) || 3000);
