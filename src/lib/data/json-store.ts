import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import type { Database } from "./integrity";
import { customerSchema, invoiceSchema, orderSchema, ticketSchema, tradeInSchema } from "./records";
import { brandSchema, dealSchema, gaugeSchema, packageSchema, productSchema } from "./schema";

/**
 * The JSON files in /data act as the database until a real one exists.
 * One file per table: { "$comment": "...", "rows": [...] }, plus one
 * single-row file (gauge-config.json).
 *
 * Reads go to disk every time so admin edits show up at once. Writes are
 * validated, serialized per file and atomic (temp file + rename).
 *
 * This only works where the server can write to its own files (`next dev`,
 * or `next start` on a normal server). Serverless hosts such as Vercel have a
 * read-only filesystem: saving throws ReadOnlyStoreError there. Before going
 * live, replace this module with a real database.
 */

const tableSchemas = {
  brands: brandSchema,
  products: productSchema,
  deals: dealSchema,
  packages: packageSchema,
  customers: customerSchema,
  orders: orderSchema,
  "trade-ins": tradeInSchema,
  tickets: ticketSchema,
  invoices: invoiceSchema,
} satisfies Record<keyof Database, z.ZodType>;

export type TableName = keyof Database;

export class ReadOnlyStoreError extends Error {
  constructor() {
    super(
      "Changes can't be saved on this server: its files are read-only (for example on Vercel). The admin needs a real database before going live.",
    );
    this.name = "ReadOnlyStoreError";
  }
}

export function dataDirectory(): string {
  return process.env.NOVACELL_DATA_DIR || path.join(process.cwd(), "data");
}

function fileFor(name: string): string {
  return path.join(dataDirectory(), `${name}.json`);
}

async function readJson(name: string): Promise<Record<string, unknown>> {
  return JSON.parse(await readFile(fileFor(name), "utf8")) as Record<string, unknown>;
}

function parseOrThrow<T>(schema: z.ZodType<T>, value: unknown, where: string): T {
  const result = schema.safeParse(value);
  if (!result.success) throw new Error(`data/${where}.json is invalid:\n${z.prettifyError(result.error)}`);
  return result.data;
}

export async function readRows<N extends TableName>(name: N): Promise<Database[N]> {
  const file = await readJson(name);
  return parseOrThrow(z.array(tableSchemas[name]), file.rows, name) as Database[N];
}

export async function readGaugeConfig() {
  const config = await readJson("gauge-config");
  delete config.$comment;
  return parseOrThrow(gaugeSchema, config, "gauge-config");
}

// --- writes ------------------------------------------------------------------

const queues = new Map<string, Promise<unknown>>();

/** Runs writes to the same file one after another, so two saves never interleave. */
function serialized<T>(name: string, task: () => Promise<T>): Promise<T> {
  const previous = queues.get(name) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  queues.set(name, next);
  return next;
}

async function writeJsonAtomically(name: string, content: unknown): Promise<void> {
  const target = fileFor(name);
  const temp = `${target}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, JSON.stringify(content, null, 2) + "\n", "utf8");
    await rename(temp, target);
  } catch (error) {
    await rm(temp, { force: true }).catch(() => undefined);
    throw toStoreError(error);
  }
}

export function toStoreError(error: unknown): unknown {
  const code = (error as NodeJS.ErrnoException | null)?.code;
  return code === "EROFS" || code === "EACCES" || code === "EPERM" ? new ReadOnlyStoreError() : error;
}

/**
 * Read-modify-write of one table. `change` gets the current rows and returns
 * the new ones; they are validated before anything is written.
 */
export function updateRows<N extends TableName>(
  name: N,
  change: (rows: Database[N]) => Database[N] | Promise<Database[N]>,
): Promise<Database[N]> {
  return serialized(name, async () => {
    const file = await readJson(name);
    const current = parseOrThrow(z.array(tableSchemas[name]), file.rows, name) as Database[N];
    const next = parseOrThrow(z.array(tableSchemas[name]), await change(current), name) as Database[N];
    await writeJsonAtomically(name, { ...file, rows: next });
    return next;
  });
}

export function writeGaugeConfig(config: z.infer<typeof gaugeSchema>) {
  return serialized("gauge-config", async () => {
    const { $comment } = await readJson("gauge-config");
    const valid = parseOrThrow(gaugeSchema, config, "gauge-config");
    await writeJsonAtomically("gauge-config", { $comment, ...valid });
    return valid;
  });
}

// --- uploaded photos ---------------------------------------------------------

export function uploadsDirectory(): string {
  return path.join(dataDirectory(), "uploads");
}

export async function saveUpload(fileName: string, bytes: Uint8Array): Promise<void> {
  try {
    await mkdir(uploadsDirectory(), { recursive: true });
    await writeFile(path.join(uploadsDirectory(), fileName), bytes);
  } catch (error) {
    throw toStoreError(error);
  }
}
