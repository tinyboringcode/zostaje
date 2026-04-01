export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { readdir, readFile, stat } from "fs/promises";
import { join, extname, basename } from "path";
import { parseCSV } from "@/lib/csv-parser";


export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  if (!settings?.watchFolderEnabled || !settings.watchFolderPath) {
    return NextResponse.json({ files: [] });
  }

  try {
    const entries = await readdir(settings.watchFolderPath);
    const csvFiles = entries.filter((f) => extname(f).toLowerCase() === ".csv");

    const files = await Promise.all(
      csvFiles.map(async (filename) => {
        const fullPath = join(settings.watchFolderPath, filename);
        const info = await stat(fullPath);
        const content = await readFile(fullPath, "utf8");
        const parsed = parseCSV(content);
        return {
          filename,
          path: fullPath,
          size: info.size,
          modifiedAt: info.mtime.toISOString(),
          transactionCount: parsed.length,
          preview: parsed.slice(0, 3),
        };
      })
    );

    return NextResponse.json({ files, folderPath: settings.watchFolderPath });
  } catch {
    return NextResponse.json({ error: "Cannot read folder", files: [] }, { status: 400 });
  }
}

export async function POST(req: Request) {
  const { filePath, categoryId } = await req.json();

  if (!filePath || !categoryId) {
    return NextResponse.json({ error: "Missing filePath or categoryId" }, { status: 400 });
  }

  try {
    const content = await readFile(filePath, "utf8");
    const parsed = parseCSV(content);

    if (parsed.length === 0) {
      return NextResponse.json({ error: "No valid transactions found" }, { status: 400 });
    }

    const created = await prisma.$transaction(
      parsed.map((tx) =>
        prisma.transaction.create({
          data: {
            amount: tx.amount,
            date: tx.date,
            description: tx.description,
            type: tx.type,
            categoryId,
          },
        })
      )
    );

    return NextResponse.json({ imported: created.length, file: basename(filePath) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
