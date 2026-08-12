if (typeof (globalThis as unknown as { structuredClone?: unknown }).structuredClone === "undefined") {
  (globalThis as unknown as { structuredClone: <T>(v: T) => T }).structuredClone = (v) =>
    v === undefined ? (undefined as unknown as typeof v) : JSON.parse(JSON.stringify(v));
}
