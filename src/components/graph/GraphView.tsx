"use client";

import * as React from "react";
import * as d3 from "d3";
import {
  buildGraph,
  nodeRadius,
  nodeColor,
  countTxForKontrahent,
  DEFAULT_FILTERS,
  type GraphData,
  type GraphNode,
  type GraphEdge,
  type GraphFilters,
} from "@/lib/graph";
import { storage, type StoredEntity } from "@/lib/storage";
import type { Transaction, Kontrahent, Project } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useVault } from "@/components/vault/VaultProvider";
import { formatCurrency, formatDate } from "@/lib/formatters";
import Link from "next/link";

interface SimNode extends GraphNode, d3.SimulationNodeDatum {}
interface SimEdge extends d3.SimulationLinkDatum<SimNode> {
  type: GraphEdge["type"];
}

type DateRange = "all" | "month" | "year";

function rangeFilters(range: DateRange): Pick<GraphFilters, "since" | "until"> {
  if (range === "all") return {};
  const now = new Date();
  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { since: start.toISOString().slice(0, 10) };
  }
  const start = new Date(now.getFullYear(), 0, 1);
  return { since: start.toISOString().slice(0, 10) };
}

export function GraphView() {
  const { unlocked } = useVault();
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const simRef = React.useRef<d3.Simulation<SimNode, SimEdge> | null>(null);

  const [filters, setFilters] = React.useState<GraphFilters>(DEFAULT_FILTERS);
  const [range, setRange] = React.useState<DateRange>("month");
  const [data, setData] = React.useState<GraphData | null>(null);
  const [transactions, setTransactions] = React.useState<StoredEntity<Transaction>[]>([]);
  const [kontrahenci, setKontrahenci] = React.useState<StoredEntity<Kontrahent>[]>([]);
  const [projects, setProjects] = React.useState<StoredEntity<Project>[]>([]);
  const [selected, setSelected] = React.useState<GraphNode | null>(null);
  const [loading, setLoading] = React.useState(true);

  // Data loading
  React.useEffect(() => {
    if (!unlocked) return;
    setLoading(true);
    const merged: GraphFilters = { ...filters, ...rangeFilters(range) };
    (async () => {
      try {
        const [g, ts, ks, ps] = await Promise.all([
          buildGraph(merged),
          storage.getAll<Transaction>("transaction"),
          storage.getAll<Kontrahent>("kontrahent"),
          storage.getAll<Project>("project"),
        ]);
        setData(g);
        setTransactions(ts);
        setKontrahenci(ks);
        setProjects(ps);
      } catch {
        // locked / error
      } finally {
        setLoading(false);
      }
    })();
  }, [unlocked, filters, range]);

  // D3 render
  React.useEffect(() => {
    if (!data || !svgRef.current || !containerRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = containerRef.current.clientWidth;
    const height = Math.max(500, containerRef.current.clientHeight);
    svg.attr("viewBox", `0 0 ${width} ${height}`);

    const root = svg.append("g");

    const nodes: SimNode[] = data.nodes.map((n) => ({ ...n }));
    const edges: SimEdge[] = data.edges.map((e) => ({
      source: e.source,
      target: e.target,
      type: e.type,
    }));

    const simulation = d3
      .forceSimulation<SimNode, SimEdge>(nodes)
      .force(
        "link",
        d3.forceLink<SimNode, SimEdge>(edges).id((d) => d.id).distance(80)
      )
      .force("charge", d3.forceManyBody().strength(-200))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force(
        "collide",
        d3.forceCollide<SimNode>().radius((d) => nodeRadius(d) + 4)
      );

    simRef.current = simulation;

    const linkSel = root
      .append("g")
      .attr("stroke", "#9ca3af")
      .attr("stroke-opacity", 0.4)
      .selectAll("line")
      .data(edges)
      .enter()
      .append("line")
      .attr("stroke-width", 1);

    const nodeSel = root
      .append("g")
      .selectAll<SVGCircleElement, SimNode>("circle")
      .data(nodes)
      .enter()
      .append("circle")
      .attr("r", (d) => nodeRadius(d))
      .attr("fill", (d) => nodeColor(d))
      .attr("stroke", "#fff")
      .attr("stroke-width", 1.2)
      .style("cursor", "pointer");

    const labelSel = root
      .append("g")
      .selectAll<SVGTextElement, SimNode>("text")
      .data(nodes.filter((n) => n.type !== "transaction"))
      .enter()
      .append("text")
      .text((d) => d.label.slice(0, 28))
      .attr("font-size", 10)
      .attr("fill", "currentColor")
      .attr("pointer-events", "none")
      .attr("dx", 12)
      .attr("dy", 3);

    // Drag: pin on drag, double-click to release.
    const drag = d3
      .drag<SVGCircleElement, SimNode>()
      .on("start", (event, d) => {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on("drag", (event, d) => {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on("end", (event, d) => {
        if (!event.active) simulation.alphaTarget(0);
        // Keep pinned after drag — user releases with dblclick.
      });
    nodeSel.call(drag);
    nodeSel.on("dblclick", (_e, d) => {
      d.fx = null;
      d.fy = null;
    });

    // Selection
    nodeSel.on("click", (_e, d) => setSelected(d));

    // Hover highlight
    const neighborMap = new Map<string, Set<string>>();
    for (const e of edges) {
      const s = typeof e.source === "string" ? e.source : (e.source as SimNode).id;
      const t = typeof e.target === "string" ? e.target : (e.target as SimNode).id;
      if (!neighborMap.has(s)) neighborMap.set(s, new Set());
      if (!neighborMap.has(t)) neighborMap.set(t, new Set());
      neighborMap.get(s)!.add(t);
      neighborMap.get(t)!.add(s);
    }

    nodeSel
      .on("mouseenter", (_e, d) => {
        const keep = neighborMap.get(d.id) ?? new Set();
        keep.add(d.id);
        nodeSel.attr("opacity", (n) => (keep.has(n.id) ? 1 : 0.15));
        labelSel.attr("opacity", (n) => (keep.has(n.id) ? 1 : 0.15));
        linkSel.attr("stroke-opacity", (l) => {
          const s = typeof l.source === "string" ? l.source : (l.source as SimNode).id;
          const t = typeof l.target === "string" ? l.target : (l.target as SimNode).id;
          return s === d.id || t === d.id ? 0.9 : 0.05;
        });
      })
      .on("mouseleave", () => {
        nodeSel.attr("opacity", 1);
        labelSel.attr("opacity", 1);
        linkSel.attr("stroke-opacity", 0.4);
      });

    // Zoom + pan
    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on("zoom", (event) => {
        root.attr("transform", event.transform.toString());
      });
    svg.call(zoom);

    simulation.on("tick", () => {
      linkSel
        .attr("x1", (d) => (d.source as SimNode).x ?? 0)
        .attr("y1", (d) => (d.source as SimNode).y ?? 0)
        .attr("x2", (d) => (d.target as SimNode).x ?? 0)
        .attr("y2", (d) => (d.target as SimNode).y ?? 0);
      nodeSel.attr("cx", (d) => d.x ?? 0).attr("cy", (d) => d.y ?? 0);
      labelSel.attr("x", (d) => d.x ?? 0).attr("y", (d) => d.y ?? 0);
    });

    return () => {
      simulation.stop();
    };
  }, [data]);

  function toggle(key: keyof GraphFilters) {
    setFilters((f) => ({ ...f, [key]: !f[key] }));
  }

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Graf</h1>
        <p className="text-sm text-muted-foreground">
          Powiązania między transakcjami, kontrahentami, projektami i kategoriami.
        </p>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["showKontrahenci", "Kontrahenci"],
            ["showProjekty", "Projekty"],
            ["showTransakcje", "Transakcje"],
            ["showKategorie", "Kategorie"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            size="sm"
            variant={filters[key] ? "default" : "outline"}
            onClick={() => toggle(key)}
          >
            {filters[key] ? "✓ " : ""}
            {label}
          </Button>
        ))}
        <div className="mx-2 h-6 w-px bg-border" />
        <select
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={range}
          onChange={(e) => setRange(e.target.value as DateRange)}
        >
          <option value="month">Ten miesiąc</option>
          <option value="year">Ten rok</option>
          <option value="all">Wszystko</option>
        </select>
        {data?.truncated && (
          <span className="text-xs text-amber-600">
            Pokazuję ostatnie 500 transakcji z {data.totalTransactions}.
          </span>
        )}
      </div>

      {/* Graph + detail panel */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <Card>
          <CardContent className="p-0">
            <div ref={containerRef} className="w-full h-[70vh] min-h-[500px]">
              {loading && (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                  Wczytuję…
                </div>
              )}
              {!loading && data && data.nodes.length === 0 && (
                <div className="h-full flex items-center justify-center text-sm text-muted-foreground text-center px-6">
                  Dodaj transakcje aby zobaczyć graf powiązań.
                </div>
              )}
              {!loading && data && data.nodes.length > 0 && (
                <svg ref={svgRef} className="w-full h-full" />
              )}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          {selected ? (
            <DetailPanel
              node={selected}
              transactions={transactions}
              kontrahenci={kontrahenci}
              projects={projects}
              onClose={() => setSelected(null)}
            />
          ) : (
            <Card>
              <CardContent className="py-6 text-sm text-muted-foreground text-center">
                Kliknij węzeł, aby zobaczyć szczegóły.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Detail panel ──────────────────────────────────────────────────────────

interface DetailProps {
  node: GraphNode;
  transactions: StoredEntity<Transaction>[];
  kontrahenci: StoredEntity<Kontrahent>[];
  projects: StoredEntity<Project>[];
  onClose: () => void;
}

function DetailPanel({ node, transactions, kontrahenci, projects, onClose }: DetailProps) {
  const rawId = node.id.split(":").slice(1).join(":");

  if (node.type === "kontrahent") {
    const stats = countTxForKontrahent(rawId, transactions);
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="truncate">{node.label}</span>
            <button className="text-xs text-muted-foreground" onClick={onClose}>
              ✕
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Przychody</span>
            <span>{formatCurrency(stats.income)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wydatki</span>
            <span>{formatCurrency(stats.expense)}</span>
          </div>
          <div className="pt-2 border-t border-border">
            <div className="text-xs text-muted-foreground mb-1">Ostatnie transakcje</div>
            <ul className="space-y-1">
              {stats.recent.map((t) => (
                <li key={t.id} className="truncate">
                  <Link href="/transactions" className="hover:underline">
                    {formatDate(t.data.date)} · {t.data.description}
                  </Link>
                </li>
              ))}
              {stats.recent.length === 0 && (
                <li className="text-xs text-muted-foreground">Brak transakcji.</li>
              )}
            </ul>
          </div>
          <Link
            href={`/contractors/${rawId}`}
            className="text-xs text-primary hover:underline block pt-2"
          >
            Zobacz wszystkie →
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (node.type === "project") {
    const project = projects.find((p) => p.id === rawId);
    const related = transactions.filter((t) => t.data.project_id === rawId);
    let income = 0;
    let expense = 0;
    for (const t of related) {
      if (t.data.type === "przychod") income += t.data.amount;
      else expense += t.data.amount;
    }
    const kontrahent = project?.data.kontrahent_id
      ? kontrahenci.find((k) => k.id === project.data.kontrahent_id)?.data.name
      : null;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <Link href={`/projects/${rawId}`} className="truncate hover:underline">
              {node.label}
            </Link>
            <button className="text-xs text-muted-foreground" onClick={onClose}>
              ✕
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Status</span>
            <span>{project?.data.status ?? "—"}</span>
          </div>
          {kontrahent && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kontrahent</span>
              <span className="truncate">{kontrahent}</span>
            </div>
          )}
          <div className="flex justify-between font-medium border-t border-border pt-1">
            <span>Wynik</span>
            <span>{formatCurrency(income - expense)}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (node.type === "transaction") {
    const t = transactions.find((x) => x.id === rawId);
    if (!t) return null;
    const kontrahentName = t.data.kontrahent_id
      ? kontrahenci.find((k) => k.id === t.data.kontrahent_id)?.data.name
      : null;
    const projectName = t.data.project_id
      ? projects.find((p) => p.id === t.data.project_id)?.data.name
      : null;
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="truncate">{t.data.description}</span>
            <button className="text-xs text-muted-foreground" onClick={onClose}>
              ✕
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Data</span>
            <span>{formatDate(t.data.date)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Kwota</span>
            <span className={t.data.type === "przychod" ? "text-emerald-600" : ""}>
              {t.data.type === "przychod" ? "+" : "−"}
              {formatCurrency(t.data.amount)}
            </span>
          </div>
          {t.data.category && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kategoria</span>
              <span>{t.data.category}</span>
            </div>
          )}
          {kontrahentName && t.data.kontrahent_id && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Kontrahent</span>
              <Link href={`/contractors/${t.data.kontrahent_id}`} className="hover:underline">
                {kontrahentName}
              </Link>
            </div>
          )}
          {projectName && t.data.project_id && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Projekt</span>
              <Link href={`/projects/${t.data.project_id}`} className="hover:underline">
                {projectName}
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (node.type === "category") {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
    const related = transactions.filter(
      (t) => t.data.category === node.label && t.data.date >= monthStart
    );
    const total = related.reduce(
      (sum, t) => sum + (t.data.type === "wydatek" ? t.data.amount : 0),
      0
    );
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center justify-between gap-2">
            <span className="truncate">{node.label}</span>
            <button className="text-xs text-muted-foreground" onClick={onClose}>
              ✕
            </button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Wydatki (ten miesiąc)</span>
            <span>{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Liczba transakcji</span>
            <span>{related.length}</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return null;
}
