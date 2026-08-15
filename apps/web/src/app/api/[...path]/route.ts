import { NextRequest, NextResponse } from "next/server";

const API_BASE = process.env.INTERNAL_API_URL || "http://localhost:3001";
const PROXY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes for long-running studio operations
const MAX_REQUEST_SIZE_BYTES = 500 * 1024 * 1024; // 500 MB for clip uploads

const PUBLIC_API_PREFIXES = ["/api/auth/"];

const SENSITIVE_HEADERS = new Set([
  "host",
  "connection",
  "x-forwarded-for",
  "x-forwarded-proto",
  "x-forwarded-host",
  "x-real-ip",
  "x-request-id",
]);

function isPublicRoute(pathname: string): boolean {
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

async function proxyRequest(req: NextRequest) {
  const url = new URL(req.url);
  const pathname = url.pathname;
  const targetUrl = `${API_BASE}${pathname}${url.search}`;

  const headers = new Headers();
  req.headers.forEach((value, key) => {
    if (SENSITIVE_HEADERS.has(key)) return;
    headers.set(key, value);
  });

  if (!isPublicRoute(pathname)) {
    const accessToken = req.cookies.get("access_token")?.value;
    if (!accessToken) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  if (req.method !== "GET" && req.method !== "HEAD") {
    const contentLength = req.headers.get("content-length");
    if (contentLength && parseInt(contentLength, 10) > MAX_REQUEST_SIZE_BYTES) {
      return NextResponse.json({ error: "Request too large" }, { status: 413 });
    }
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const init: RequestInit = {
      method: req.method,
      headers,
      redirect: "manual",
      signal: controller.signal,
    };

    if (req.method !== "GET" && req.method !== "HEAD") {
      init.body = req.body;
      // @ts-expect-error duplex is needed for streaming request bodies
      init.duplex = "half";
    }

    const res = await fetch(targetUrl, init);

    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (location) {
        const redirectHeaders = new Headers();
        redirectHeaders.set("location", location);
        if (typeof res.headers.getSetCookie === "function") {
          for (const cookie of res.headers.getSetCookie()) {
            redirectHeaders.append("set-cookie", cookie);
          }
        }
        return new NextResponse(null, { status: res.status, headers: redirectHeaders });
      }
    }

    const responseHeaders = new Headers();
    res.headers.forEach((value, key) => {
      if (key === "transfer-encoding") return;
      responseHeaders.set(key, value);
    });

    return new NextResponse(res.body, {
      status: res.status,
      statusText: res.statusText,
      headers: responseHeaders,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return NextResponse.json({ error: "Gateway timeout" }, { status: 504 });
    }
    return NextResponse.json({ error: "Bad gateway" }, { status: 502 });
  } finally {
    clearTimeout(timeout);
  }
}

export async function GET(req: NextRequest) {
  return proxyRequest(req);
}

export async function POST(req: NextRequest) {
  return proxyRequest(req);
}

export async function PUT(req: NextRequest) {
  return proxyRequest(req);
}

export async function PATCH(req: NextRequest) {
  return proxyRequest(req);
}

export async function DELETE(req: NextRequest) {
  return proxyRequest(req);
}
