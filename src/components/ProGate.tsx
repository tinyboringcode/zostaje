"use client";

import * as React from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { isPro, fetchPlan, featureCopy } from "@/lib/pro";

interface ProGateProps {
  feature: keyof typeof featureCopy;
  children: React.ReactNode;
  /**
   * If true, children render UNDER the upgrade card for free users
   * (preview mode). Default: false — render children only when Pro.
   */
  preview?: boolean;
}

export function ProGate({ feature, children, preview = false }: ProGateProps) {
  const [pro, setPro] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    fetchPlan().then((p) => setPro(p === "pro"));
  }, []);

  if (pro === null) {
    // Optimistic — show the gated children briefly; avoids flicker on Pro.
    return isPro() ? <>{children}</> : <UpgradePrompt feature={feature} preview={preview}>{children}</UpgradePrompt>;
  }

  if (pro) return <>{children}</>;
  return <UpgradePrompt feature={feature} preview={preview}>{children}</UpgradePrompt>;
}

function UpgradePrompt({
  feature,
  preview,
  children,
}: {
  feature: keyof typeof featureCopy;
  preview: boolean;
  children: React.ReactNode;
}) {
  const copy = featureCopy[feature];
  return (
    <div className="space-y-3">
      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="text-base">Ta funkcja wymaga planu Pro</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>
            <span className="font-medium">{copy?.title ?? feature}</span>
            {copy?.price && <span className="text-muted-foreground"> — {copy.price}</span>}
          </p>
          <Button asChild>
            <Link href="/cennik">Przejdź na Pro →</Link>
          </Button>
        </CardContent>
      </Card>
      {preview && (
        <div className="opacity-40 pointer-events-none select-none">{children}</div>
      )}
    </div>
  );
}
