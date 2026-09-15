import { Injectable, Logger } from "@nestjs/common";
import { spawn, ChildProcess } from "child_process";
import { join } from "path";

const MCP_PROTOCOL_VERSION = "2024-11-05";

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: number;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: number;
  result?: unknown;
  error?: { code: number; message: string };
}

interface JsonRpcMessage {
  headers: string;
  body: string;
}

@Injectable()
export class McpClient {
  private readonly logger = new Logger(McpClient.name);
  private process: ChildProcess | null = null;
  private requestId = 0;
  private pendingRequests = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>();
  private buffer = "";
  private initialized = false;
  private readonly mcpServerPath: string;
  private readonly env: Record<string, string>;

  constructor() {
    this.mcpServerPath = process.env.MCP_SERVER_PATH || join(process.cwd(), "..", "youtube-studio-mcp");
    this.env = {
      ...process.env,
      YOUTUBE_CLIENT_SECRETS: process.env.YOUTUBE_CLIENT_SECRETS || "secrets/client_secret.json",
      YOUTUBE_TOKEN_FILE: process.env.YOUTUBE_TOKEN_FILE || "secrets/token.json",
    } as Record<string, string>;
  }

  async start(): Promise<void> {
    if (this.process) return;

    this.logger.log("Starting MCP server process");

    this.process = spawn("python3", ["scripts/server.py"], {
      cwd: this.mcpServerPath,
      env: this.env,
      stdio: ["pipe", "pipe", "pipe"],
    });

    this.process.on("error", (err) => {
      this.logger.error(`MCP process error: ${err.message}`);
      this.cleanup();
    });

    this.process.on("exit", (code) => {
      this.logger.warn(`MCP process exited with code ${code}`);
      this.cleanup();
    });

    this.process.stdout?.on("data", (chunk: Buffer) => {
      this.handleStdout(chunk);
    });

    this.process.stderr?.on("data", (chunk: Buffer) => {
      const msg = chunk.toString().trim();
      if (msg) this.logger.debug(`MCP stderr: ${msg}`);
    });

    await this.initialize();
  }

  async stop(): Promise<void> {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
    this.initialized = false;
    this.pendingRequests.clear();
  }

  async callTool(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
    if (!this.initialized) {
      await this.start();
    }

    const result = await this.request("tools/call", { name, arguments: args });

    const response = result as { content?: Array<{ type: string; text: string }> };
    if (response?.content?.[0]?.text) {
      try {
        return JSON.parse(response.content[0].text);
      } catch {
        return response.content[0].text;
      }
    }

    return result;
  }

  private async initialize(): Promise<void> {
    const result = await this.request("initialize", {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: { tools: {} },
      clientInfo: { name: "spikeclip", version: "1.0.0" },
    });

    const response = result as { protocolVersion?: string };
    if (response?.protocolVersion) {
      this.logger.log(`MCP server initialized (protocol: ${response.protocolVersion})`);
    }

    await this.request("notifications/initialized", {});
    this.initialized = true;
  }

  private request(method: string, params: Record<string, unknown>): Promise<unknown> {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin) {
        reject(new Error("MCP process not running"));
        return;
      }

      const id = ++this.requestId;
      const request: JsonRpcRequest = {
        jsonrpc: "2.0",
        id,
        method,
        params,
      };

      this.pendingRequests.set(id, { resolve, reject });

      const body = JSON.stringify(request);
      const message = `Content-Length: ${Buffer.byteLength(body)}\r\n\r\n${body}`;

      this.process.stdin.write(message, (err) => {
        if (err) {
          this.pendingRequests.delete(id);
          reject(new Error(`Failed to write to MCP process: ${err.message}`));
        }
      });

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`MCP request timeout: ${method}`));
        }
      }, 30_000);
    });
  }

  private handleStdout(chunk: Buffer): void {
    this.buffer += chunk.toString();

    while (true) {
      const headerEnd = this.buffer.indexOf("\r\n\r\n");
      if (headerEnd === -1) break;

      const header = this.buffer.slice(0, headerEnd);
      const contentLengthMatch = header.match(/Content-Length:\s*(\d+)/i);
      if (!contentLengthMatch) {
        this.buffer = this.buffer.slice(headerEnd + 4);
        continue;
      }

      const contentLength = parseInt(contentLengthMatch[1], 10);
      const bodyStart = headerEnd + 4;

      if (this.buffer.length < bodyStart + contentLength) break;

      const body = this.buffer.slice(bodyStart, bodyStart + contentLength);
      this.buffer = this.buffer.slice(bodyStart + contentLength);

      try {
        const response = JSON.parse(body) as JsonRpcResponse;
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          this.pendingRequests.delete(response.id);
          if (response.error) {
            pending.reject(new Error(`MCP error ${response.error.code}: ${response.error.message}`));
          } else {
            pending.resolve(response.result);
          }
        }
      } catch (err) {
        this.logger.error(`Failed to parse MCP response: ${err}`);
      }
    }
  }

  private cleanup(): void {
    this.initialized = false;
    this.process = null;
    for (const pending of this.pendingRequests.values()) {
      pending.reject(new Error("MCP process terminated"));
    }
    this.pendingRequests.clear();
  }
}
