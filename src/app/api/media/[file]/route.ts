import { readFile } from "node:fs/promises";
import path from "node:path";

import { NextResponse } from "next/server";

const FILE_NAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(jpg|png|webp)$/i;

const TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  if (!FILE_NAME.test(file)) {
    return NextResponse.json({ error: "Fajl nije pronađen." }, { status: 404 });
  }
  const filePath = path.join(process.cwd(), ".data", "uploads", file);
  try {
    const bytes = await readFile(filePath);
    const extension = file.split(".").at(-1)?.toLowerCase() ?? "";
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": TYPES[extension] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Fajl nije pronađen." }, { status: 404 });
  }
}
