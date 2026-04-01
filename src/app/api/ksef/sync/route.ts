export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";
import { authenticate, fetchInvoices, terminateSession } from "@/server/ksef";

export async function POST(req: NextRequest) {
  const settings = await prisma.settings.findUnique({ where: { id: 1 } });

  if (!settings?.ksefEnabled || !settings.ksefToken || !settings.nip) {
    return NextResponse.json({ error: "KSeF not configured" }, { status: 400 });
  }

  const { from, to } = await req.json().catch(() => ({}));
  const fromDate = from ? new Date(from) : new Date(new Date().setDate(1)); // start of month
  const toDate = to ? new Date(to) : new Date();

  let sessionToken: string | null = null;

  try {
    const env = settings.ksefEnvironment as "test" | "prod";
    sessionToken = await authenticate(env, settings.nip, settings.ksefToken);

    const invoices = await fetchInvoices(env, sessionToken, fromDate, toDate);

    // Find default expense category
    const defaultCat = await prisma.category.findFirst({
      where: { type: "EXPENSE", isDefault: true, name: { contains: "Inne" } },
    });

    let imported = 0;
    let skipped = 0;

    for (const inv of invoices) {
      // Check if already imported
      const exists = await prisma.kSeFImport.findUnique({
        where: { ksefNumber: inv.ksefReferenceNumber },
      });
      if (exists) { skipped++; continue; }

      if (!defaultCat) continue;

      await prisma.$transaction([
        prisma.transaction.create({
          data: {
            amount: inv.grossValue,
            date: new Date(inv.issuedAt || inv.acquisitionTimestamp),
            description: `FV ${inv.invoiceNumber}`,
            contractor: inv.sellerName,
            type: "EXPENSE",
            categoryId: defaultCat.id,
          },
        }),
        prisma.kSeFImport.create({
          data: { ksefNumber: inv.ksefReferenceNumber },
        }),
      ]);
      imported++;
    }

    return NextResponse.json({
      imported,
      skipped,
      total: invoices.length,
      period: { from: fromDate.toISOString(), to: toDate.toISOString() },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  } finally {
    if (sessionToken) await terminateSession(settings.ksefEnvironment as "test" | "prod", sessionToken);
  }
}
