import http from "node:http";
import { readFile } from "node:fs/promises";

const profiles = { normal: { venue: "The Lantern" } };
// A stale deployment profile reproduces a real bootstrap failure before listen().
const profile = profiles[process.env.DEMO_PROFILE || "normal"];
console.log("Opening box office: " + profile.venue);

const assets = new Map([
  ["/", ["public/index.html", "text/html"]],
  ["/app.js", ["public/app.js", "text/javascript"]],
  ["/style.css", ["public/style.css", "text/css"]],
  ["/react.js", ["node_modules/react/umd/react.production.min.js", "text/javascript"]],
  ["/react-dom.js", ["node_modules/react-dom/umd/react-dom.production.min.js", "text/javascript"]],
]);

async function logBrowserError(req, res) {
  let bytes = 0;
  const chunks = [];
  for await (const chunk of req) {
    bytes += chunk.length;
    if (bytes > 16384) return res.writeHead(413).end();
    chunks.push(chunk);
  }
  const { message, stack } = JSON.parse(Buffer.concat(chunks).toString());
  if (typeof message !== "string" || typeof stack !== "string") return res.writeHead(400).end();
  console.log("BROWSER_ERROR " + JSON.stringify({ message, stack }));
  res.writeHead(204).end();
}

http.createServer(async (req, res) => {
  try {
    if (req.method === "POST" && req.url?.split("?")[0] === "/api/quote") {
      const url = new URL(req.url, "http://localhost");
      const seats = url.searchParams.getAll("seat");
      const total = Number(url.searchParams.get("total"));
      const valid = seats.length && seats.length <= 32 && new Set(seats).size === seats.length
        && seats.every(seat => /^[A-D][1-8]$/.test(seat));
      const unavailable = seats.find(seat => ["A3", "A4", "B6", "D2", "D7", "D8"].includes(seat));
      let message = "";
      if (!valid) message = "Please select valid seats.";
      else if (unavailable) message = "Seat " + unavailable + " has already been taken. Choose another seat.";
      else if (total !== seats.length * 12 + 2) message = "Price mismatch. The booking fee should be $2 per order.";
      return res.writeHead(message ? 409 : 200, { "Content-Type": "application/json" })
        .end(JSON.stringify({ message }));
    }
    if (req.method === "POST" && req.url === "/events") {
      if (req.headers["content-type"] !== "application/json") return res.writeHead(415).end();
      return await logBrowserError(req, res);
    }
    const asset = assets.get(req.url);
    if (req.method !== "GET" || !asset) return res.writeHead(404).end();
    const body = await readFile(new URL(asset[0], import.meta.url));
    res.writeHead(200, { "Content-Type": asset[1] }).end(body);
  } catch (err) {
    res.writeHead(err instanceof SyntaxError || err instanceof TypeError ? 400 : 500).end();
  }
}).listen(3000, "0.0.0.0");
