import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { useAppStore } from "@/store/useAppStore";
import type { PointsSummary } from "@/store/useAppStore";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Activity, Monitor, Smartphone, Tag, X } from "lucide-react";

function PointsDetailDialog({
    name,
    email,
    pts,
    onClose,
}: {
    name: string;
    email?: string;
    pts: PointsSummary;
    onClose: () => void;
}) {
    return (
        <div
            className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-end sm:justify-center z-50"
            onClick={onClose}
        >
            <div
                className="bg-card border border-border rounded-t-2xl sm:rounded-xl shadow-xl w-full sm:w-[340px] max-h-[90vh] overflow-y-auto scrollbar-thin"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-start gap-2 px-5 pt-4 pb-3 sticky top-0 bg-card border-b border-border">
                    <div className="flex-1 min-w-0">
                        <h2 className="text-base font-semibold">{name}</h2>
                        {email && <p className="text-xs text-muted-foreground truncate mt-0.5">{email}</p>}
                    </div>
                    <button onClick={onClose} className="rounded-full p-1 hover:bg-accent -mr-1">
                        <X className="w-5 h-5" />
                    </button>
                </div>
                <div className="px-5 py-4 flex flex-col gap-4">
                    <div>
                        <p className="text-xs text-muted-foreground mb-2">Today's points</p>
                        <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl border border-border">
                            <span className="text-3xl">🪙</span>
                            <span className="text-4xl font-bold">{pts.today}</span>
                        </div>
                    </div>
                    <div className="rounded-xl border border-border overflow-hidden text-sm">
                        <div className="bg-muted/60 px-4 py-2.5 flex justify-between text-xs text-muted-foreground font-medium">
                            <span>Today's activity</span>
                            <span>Points</span>
                        </div>
                        <div className="divide-y divide-border">
                            <div className="px-4 py-3 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Monitor className="w-4 h-4 text-muted-foreground" />
                                    Desktop Bing search
                                </span>
                                {pts.desktop ? (
                                    <span>
                                        <span className="font-semibold">{pts.desktop.split("/")[0]}</span>
                                        <span className="text-muted-foreground">/{pts.desktop.split("/")[1]}</span>
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </div>
                            <div className="px-4 py-3 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                                    Mobile Bing search
                                </span>
                                {pts.mobile ? (
                                    <span>
                                        <span className="font-semibold">{pts.mobile.split("/")[0]}</span>
                                        <span className="text-muted-foreground">/{pts.mobile.split("/")[1]}</span>
                                    </span>
                                ) : (
                                    <span className="text-muted-foreground">—</span>
                                )}
                            </div>
                            <div className="px-4 py-3 flex items-center justify-between">
                                <span className="flex items-center gap-2">
                                    <Tag className="w-4 h-4 text-muted-foreground" />
                                    Offers
                                </span>
                                <span className="font-semibold">{pts.offers ?? 0}</span>
                            </div>
                        </div>
                    </div>
                    {(pts.thisMonth > 0 || pts.thisYear > 0 || pts.lifetime > 0) && (
                        <div className="rounded-xl border border-border overflow-hidden text-sm">
                            <div className="bg-muted/60 px-4 py-2.5 flex justify-between text-xs text-muted-foreground font-medium">
                                <span>History</span>
                                <span>Points</span>
                            </div>
                            <div className="divide-y divide-border">
                                {pts.thisMonth > 0 && (
                                    <div className="px-4 py-3 flex justify-between">
                                        <span>This month</span>
                                        <span className="font-mono font-medium">{pts.thisMonth.toLocaleString()}</span>
                                    </div>
                                )}
                                {pts.thisYear > 0 && (
                                    <div className="px-4 py-3 flex justify-between">
                                        <span>This year</span>
                                        <span className="font-mono font-medium">{pts.thisYear.toLocaleString()}</span>
                                    </div>
                                )}
                                {pts.lifetime > 0 && (
                                    <div className="px-4 py-3 flex justify-between">
                                        <span>Lifetime</span>
                                        <span className="font-mono font-medium">{pts.lifetime.toLocaleString()}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
                <div className="px-5 pb-5">
                    <Button className="w-full" onClick={onClose}>
                        Close
                    </Button>
                </div>
            </div>
        </div>
    );
}

export function ProgressPanel() {
    const { data: status } = useQuery({ queryKey: ["status"], queryFn: api.getStatus, refetchInterval: 2000 });
    const { data: profiles } = useQuery({ queryKey: ["profiles"], queryFn: api.getProfiles });
    const wsProgress = useAppStore((s) => s.progress);
    const allPoints = useAppStore((s) => s.points);
    const running = status?.running ?? false;
    const [selectedProfile, setSelectedProfile] = useState<string | null>(null);

    const emailByName = Object.fromEntries((profiles ?? []).map((p) => [p.name, p.email]));

    const merged = { ...(status?.progress ?? {}), ...wsProgress };
    const runningEntries = Object.entries(merged);

    const pointEntries = Object.entries(allPoints).sort((a, b) => {
        const isDone = (d: string) => {
            if (!d) return true;
            const [n, t] = d.split("/").map(Number);
            return n >= t;
        };
        const aFull = isDone(a[1].desktop),
            bFull = isDone(b[1].desktop);
        if (aFull !== bFull) return aFull ? 1 : -1;
        return b[1].today - a[1].today;
    });

    if (!running && runningEntries.length === 0 && pointEntries.length === 0) return null;

    const dPct = (d: string) => {
        if (!d) return 0;
        const [n, t] = d.split("/").map(Number);
        return t > 0 ? Math.round((n / t) * 100) : 0;
    };
    const dFull = (d: string) => {
        if (!d) return false;
        const [n, t] = d.split("/").map(Number);
        return n >= t;
    };

    return (
        <>
            {(running || runningEntries.length > 0) && (
                <Card>
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm flex items-center gap-2">
                            <Activity className="w-4 h-4" />
                            Tiến độ
                            {running && (
                                <Badge variant="secondary" className="ml-auto text-[10px]">
                                    Đang chạy
                                </Badge>
                            )}
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2.5">
                        {runningEntries.map(([name, prog]) => {
                            const pct = prog.total > 0 ? Math.round((prog.done / prog.total) * 100) : 0;
                            return (
                                <div key={name}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-medium truncate max-w-[60%]">{name}</span>
                                        <span className="font-mono text-muted-foreground">
                                            {prog.done}/{prog.total} <span className="text-primary">{pct}%</span>
                                        </span>
                                    </div>
                                    <Progress value={pct} className="h-1.5" />
                                </div>
                            );
                        })}
                    </CardContent>
                </Card>
            )}

            {pointEntries.length > 0 && (
                <Card className="overflow-hidden">
                    <CardHeader className="pb-2">
                        <CardTitle className="text-sm">🪙 Điểm thưởng</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="divide-y divide-border">
                            {pointEntries.map(([name, pts]) => {
                                const full = dFull(pts.desktop);
                                const pct = dPct(pts.desktop);
                                return (
                                    <button
                                        key={name}
                                        onClick={() => setSelectedProfile(name)}
                                        className="w-full px-4 py-2.5 hover:bg-accent/40 transition-colors text-left"
                                    >
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium truncate">{name}</div>
                                                {emailByName[name] && (
                                                    <div className="text-[11px] text-muted-foreground/70 truncate mt-0.5">
                                                        {emailByName[name]}
                                                    </div>
                                                )}
                                            </div>
                                            <span className="text-base font-semibold shrink-0 tabular-nums text-foreground pt-0.5">
                                                {pts.today > 0 ? pts.today : "—"}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="flex-1 h-[3px] bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full transition-all ${full ? "bg-emerald-500/70" : "bg-sky-500/60"}`}
                                                    style={{ width: `${pct}%` }}
                                                />
                                            </div>
                                            <span
                                                className={`text-[10px] font-mono shrink-0 w-11 text-right ${full ? "text-emerald-500/80" : "text-sky-400/80"}`}
                                            >
                                                {pts.desktop || "—"}
                                            </span>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {selectedProfile && allPoints[selectedProfile] && (
                <PointsDetailDialog
                    name={selectedProfile}
                    email={emailByName[selectedProfile]}
                    pts={allPoints[selectedProfile]}
                    onClose={() => setSelectedProfile(null)}
                />
            )}
        </>
    );
}
