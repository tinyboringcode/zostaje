"use client";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Card, CardBody } from "@heroui/react";
import { Button } from "@heroui/react";
import { Sparkles, RefreshCw } from "lucide-react";

export function AIAnalysis({ month, compact = false }: { month: string; compact?: boolean }) {
  const [analysis, setAnalysis] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      fetch("/api/ai/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month }),
      }).then((r) => r.json()),
    onSuccess: (data) => { if (data.analysis) setAnalysis(data.analysis); },
  });

  if (compact) {
    return (
      <Card className="glass border-0 bg-gradient-to-br from-violet-500/10 to-primary/5" shadow="none">
        <CardBody className="p-4">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950 shrink-0">
              <Sparkles className="h-4 w-4 text-violet-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-default-400 mb-1 uppercase tracking-wider">AI Asystent</div>
              {analysis ? (
                <p className="text-sm leading-relaxed line-clamp-3">{analysis}</p>
              ) : (
                <p className="text-sm text-default-500">Kliknij, żeby AI przeanalizowało Twoje wydatki w tym miesiącu.</p>
              )}
            </div>
            <Button
              isIconOnly size="sm" variant="light"
              isLoading={mutation.isPending}
              onPress={() => mutation.mutate()}
            >
              {!mutation.isPending && <RefreshCw className="h-4 w-4" />}
            </Button>
          </div>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="glass border-0 bg-gradient-to-br from-violet-500/10 to-primary/5 ring-1 ring-violet-500/20" shadow="none">
      <CardBody className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-950">
            <Sparkles className="h-4 w-4 text-violet-500" />
          </div>
          <div className="font-semibold text-sm">Analiza AI (lokalnie)</div>
          <div className="ml-auto">
            {analysis && (
              <Button size="sm" variant="light" isLoading={mutation.isPending}
                startContent={!mutation.isPending ? <RefreshCw className="h-3.5 w-3.5" /> : undefined}
                onPress={() => { setAnalysis(null); mutation.mutate(); }}>
                Odśwież
              </Button>
            )}
          </div>
        </div>
        {analysis ? (
          <p className="text-sm leading-relaxed text-default-700 dark:text-default-300">{analysis}</p>
        ) : (
          <div className="flex items-center gap-3">
            <p className="text-sm text-default-500 flex-1">
              Poproś lokalny model AI o analizę Twoich wydatków w tym miesiącu.
            </p>
            <Button color="primary" size="sm" variant="flat"
              isLoading={mutation.isPending}
              startContent={!mutation.isPending ? <Sparkles className="h-3.5 w-3.5" /> : undefined}
              onPress={() => mutation.mutate()}>
              {mutation.isPending ? "Analizuję..." : "Analizuj"}
            </Button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
