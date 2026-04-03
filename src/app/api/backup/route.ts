export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import fs from "fs";
import path from "path";

function getDbPath(): string {
  const url = process.env.DATABASE_URL ?? "file:./dev.db";
  const rel = url.replace(/^file:/, "");
  return path.isAbsolute(rel) ? rel : path.resolve(process.cwd(), rel);
}

export async function GET() {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const dbPath = getDbPath();
  const dbExists = fs.existsSync(dbPath);
  const dbSize = dbExists ? fs.statSync(dbPath).size : 0;

  return NextResponse.json({
    enabled: settings?.backupEnabled ?? false,
    backupPath: settings?.backupPath ?? "./backups",
    lastBackupAt: settings?.backupLastAt ?? null,
    dbPath,
    dbSizeBytes: dbSize,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));

  // Aktualizacja ustawień backupu
  if (body.settings !== undefined) {
    await prisma.settings.update({
      where: { id: 1 },
      data: {
        backupEnabled: body.settings.enabled ?? undefined,
        backupPath: body.settings.path ?? undefined,
      },
    });
    return NextResponse.json({ ok: true });
  }

  // Wykonaj backup
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });
  const dbPath = getDbPath();

  if (!fs.existsSync(dbPath)) {
    return NextResponse.json({ error: "Plik bazy danych nie istnieje" }, { status: 500 });
  }

  const backupDir = path.isAbsolute(settings?.backupPath ?? "./backups")
    ? settings!.backupPath
    : path.resolve(process.cwd(), settings?.backupPath ?? "./backups");

  try {
    fs.mkdirSync(backupDir, { recursive: true });
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
    const backupFile = path.join(backupDir, `backup-${timestamp}.db`);
    fs.copyFileSync(dbPath, backupFile);

    await prisma.settings.update({
      where: { id: 1 },
      data: { backupLastAt: new Date() },
    });

    // Usuń backupy starsze niż 30 dni (zachowaj max 30)
    const files = fs.readdirSync(backupDir)
      .filter((f) => f.startsWith("backup-") && f.endsWith(".db"))
      .map((f) => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    files.slice(30).forEach((f) => fs.unlinkSync(path.join(backupDir, f.name)));

    return NextResponse.json({
      ok: true,
      file: backupFile,
      sizeBytes: fs.statSync(backupFile).size,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Nieznany błąd";
    return NextResponse.json({ error: `Backup nieudany: ${msg}` }, { status: 500 });
  }
}
