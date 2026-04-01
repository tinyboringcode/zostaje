import { prisma } from "@/server/db";

export interface CategoryBaseline {
  categoryId: string;
  categoryName: string;
  mean: number;
  stddev: number;
  sampleMonths: number;
}

export interface Anomaly {
  categoryId: string;
  categoryName: string;
  currentAmount: number;
  expectedAmount: number;
  zScore: number;
  direction: "high" | "low";
  severity: "mild" | "notable" | "strong"; // |z|: 1-1.5, 1.5-2.5, >2.5
}

function stddev(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

export async function computeBaselines(txType: string): Promise<CategoryBaseline[]> {
  const now = new Date();
  // Look at last 6 months, excluding current month
  const months: string[] = [];
  for (let i = 1; i <= 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
  }

  const categories = await prisma.category.findMany({
    where: { type: txType, isArchived: false },
    select: { id: true, name: true },
  });

  const baselines: CategoryBaseline[] = [];

  for (const cat of categories) {
    const monthly: number[] = [];
    for (const month of months) {
      const [year, monthNum] = month.split("-").map(Number);
      const start = new Date(year, monthNum - 1, 1);
      const end = new Date(year, monthNum, 1);

      const agg = await prisma.transaction.aggregate({
        where: {
          categoryId: cat.id,
          type: txType,
          date: { gte: start, lt: end },
        },
        _sum: { amount: true },
      });

      monthly.push(agg._sum.amount ?? 0);
    }

    const nonZero = monthly.filter((v) => v > 0);
    if (nonZero.length < 2) continue; // not enough data

    const mean = nonZero.reduce((a, b) => a + b, 0) / nonZero.length;
    const sd = stddev(nonZero);

    baselines.push({
      categoryId: cat.id,
      categoryName: cat.name,
      mean,
      stddev: sd,
      sampleMonths: nonZero.length,
    });
  }

  return baselines;
}

export async function detectAnomalies(): Promise<Anomaly[]> {
  const now = new Date();
  const currentStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const currentEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1);

  const anomalies: Anomaly[] = [];

  for (const txType of ["EXPENSE", "INCOME"] as const) {
    const baselines = await computeBaselines(txType);

    for (const baseline of baselines) {
      if (baseline.stddev < 1) continue; // no meaningful variance

      const agg = await prisma.transaction.aggregate({
        where: {
          categoryId: baseline.categoryId,
          type: txType,
          date: { gte: currentStart, lt: currentEnd },
        },
        _sum: { amount: true },
      });

      const current = agg._sum.amount ?? 0;
      if (current === 0) continue;

      const z = (current - baseline.mean) / baseline.stddev;
      const absZ = Math.abs(z);

      if (absZ < 1.0) continue;

      let severity: Anomaly["severity"] = "mild";
      if (absZ > 2.5) severity = "strong";
      else if (absZ > 1.5) severity = "notable";

      anomalies.push({
        categoryId: baseline.categoryId,
        categoryName: baseline.categoryName,
        currentAmount: current,
        expectedAmount: baseline.mean,
        zScore: z,
        direction: z > 0 ? "high" : "low",
        severity,
      });
    }
  }

  // Sort by absolute z-score descending
  return anomalies.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
}
