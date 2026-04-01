export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/db";

export async function GET() {
  const settings = await prisma.settings.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1 },
  });
  return NextResponse.json(settings);
}

export async function PUT(req: NextRequest) {
  const body = await req.json();
  const settings = await prisma.settings.update({
    where: { id: 1 },
    data: {
      companyName: body.companyName,
      nip: body.nip ?? "",
      taxForm: body.taxForm ?? "linear",
      isVatPayer: body.isVatPayer ?? false,
      address: body.address ?? "",
      currency: body.currency ?? "PLN",
      fiscalYearStart: body.fiscalYearStart ?? 1,
      ollamaUrl: body.ollamaUrl ?? "http://localhost:11434",
      ollamaModel: body.ollamaModel ?? "llama3.2",
      ollamaEnabled: body.ollamaEnabled ?? false,
      onboardingCompleted: body.onboardingCompleted ?? false,
      ksefToken: body.ksefToken ?? "",
      ksefEnvironment: body.ksefEnvironment ?? "test",
      ksefEnabled: body.ksefEnabled ?? false,
      watchFolderPath: body.watchFolderPath ?? "",
      watchFolderEnabled: body.watchFolderEnabled ?? false,
      notificationEmail: body.notificationEmail ?? "",
      smtpHost: body.smtpHost ?? "",
      smtpPort: body.smtpPort ?? 587,
      smtpUser: body.smtpUser ?? "",
      smtpPass: body.smtpPass ?? "",
      smtpEnabled: body.smtpEnabled ?? false,
      budgetAlertEnabled: body.budgetAlertEnabled ?? true,
      budgetAlertThreshold: body.budgetAlertThreshold ?? 80,
      notifyInterval: body.notifyInterval ?? "immediate",
      digestEnabled: body.digestEnabled ?? false,
      digestFrequency: body.digestFrequency ?? "weekly",
      digestDays: body.digestDays ?? 7,
      invoiceTemplate: body.invoiceTemplate ?? "FV/{YYYY}/{NNN}",
      invoiceCounter: body.invoiceCounter ?? 1,
      zusStage: body.zusStage ?? "full",
      vatPeriod: body.vatPeriod ?? "monthly",
      ryczaltRate: body.ryczaltRate ?? 12,
      companyStartDate: body.companyStartDate ?? "",
    },
  });
  const res = NextResponse.json(settings);
  // Refresh onboarding cookie
  if (body.onboardingCompleted) {
    res.cookies.set("onboarding-completed", "1", { path: "/", httpOnly: true });
  } else {
    res.cookies.delete("onboarding-completed");
  }
  return res;
}
