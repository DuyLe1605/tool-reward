import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, CheckCheck, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

function ProfileAvatar({ name }: { name: string }) {
    const initials = name
        .replace(/profile\s*/i, "")
        .trim()
        .slice(0, 2)
        .toUpperCase();
    return (
        <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/20 flex items-center justify-center shrink-0">
            <span className="text-[10px] font-bold text-primary leading-none">{initials}</span>
        </div>
    );
}

export function ProfileList() {
    const { data: profiles = [], isLoading } = useQuery({
        queryKey: ["profiles"],
        queryFn: api.getProfiles,
        staleTime: 60_000,
    });

    const { data: status } = useQuery({
        queryKey: ["status"],
        queryFn: api.getStatus,
        refetchInterval: 2000,
    });

    const selectedIndices = useAppStore((s) => s.selectedIndices);
    const setSelectedIndices = useAppStore((s) => s.setSelectedIndices);

    const toggle = (idx: number) => {
        setSelectedIndices(
            selectedIndices.includes(idx) ? selectedIndices.filter((i) => i !== idx) : [...selectedIndices, idx],
        );
    };

    const running = status?.running ?? false;
    const allSelected = profiles.length > 0 && selectedIndices.length === profiles.length;

    const toggleAll = () => {
        if (running) return;
        setSelectedIndices(allSelected ? [] : profiles.map((_, i) => i));
    };

    return (
        <Card className="flex flex-col">
            <CardHeader className="pb-2 shrink-0">
                <CardTitle className="text-sm flex items-center gap-2 flex-nowrap">
                    <Users className="w-4 h-4 text-primary shrink-0" />
                    <span className="shrink-0">Profiles Edge</span>
                    <div className="flex items-center gap-1 ml-auto shrink-0">
                        <Badge variant="secondary" className="tabular-nums">
                            {selectedIndices.length > 0
                                ? `${selectedIndices.length}/${profiles.length}`
                                : profiles.length}
                        </Badge>
                    </div>
                    <Button
                        variant={allSelected ? "secondary" : "outline"}
                        size="sm"
                        className="h-7 px-2.5 text-[11px] gap-1"
                        onClick={toggleAll}
                        disabled={running || profiles.length === 0}
                    >
                        {allSelected ? (
                            <>
                                <X className="w-3 h-3" />
                                Bỏ chọn
                            </>
                        ) : (
                            <>
                                <CheckCheck className="w-3 h-3" />
                                Chọn tất cả
                            </>
                        )}
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0 flex-1 overflow-hidden">
                <ScrollArea className="h-80">
                    {isLoading ? (
                        <div className="px-4 py-8 text-center text-xs text-muted-foreground">Đang tải...</div>
                    ) : (
                        <ul>
                            {profiles.map((p, idx) => {
                                const isSelected = selectedIndices.includes(idx);
                                const prog = status?.progress?.[p.name];
                                const isRunning = running && status?.profiles?.some((sp) => sp.name === p.name);
                                const progressPct = prog ? Math.round((prog.done / prog.total) * 100) : 0;

                                return (
                                    <li
                                        key={p.folder}
                                        onClick={() => !running && toggle(idx)}
                                        className={cn(
                                            "flex items-center gap-3 px-3 py-2.5 border-b border-border/50 last:border-0 transition-all cursor-pointer select-none",
                                            isSelected
                                                ? "bg-primary/8 border-l-2 border-l-primary"
                                                : "border-l-2 border-l-transparent hover:bg-muted/40",
                                            running && "cursor-default",
                                        )}
                                    >
                                        <Switch
                                            checked={isSelected}
                                            onCheckedChange={() => !running && toggle(idx)}
                                            disabled={running}
                                            className="shrink-0 pointer-events-none"
                                        />
                                        <ProfileAvatar name={p.name} />
                                        <div className="min-w-0 flex-1 space-y-0.5">
                                            <div className="flex items-center gap-1.5">
                                                <p className="text-xs font-semibold text-foreground truncate leading-tight">
                                                    {p.name}
                                                </p>
                                                {isRunning && (
                                                    <span className="inline-flex items-center gap-1 shrink-0">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-[11px] text-muted-foreground truncate leading-tight">
                                                {p.email}
                                            </p>
                                            {isRunning && prog && (
                                                <div className="flex items-center gap-2 pt-0.5">
                                                    <div className="flex-1 h-1 rounded-full bg-muted overflow-hidden">
                                                        <div
                                                            className="h-full bg-primary rounded-full transition-all duration-500"
                                                            style={{ width: `${progressPct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-[10px] text-primary font-mono shrink-0 tabular-nums">
                                                        {prog.done}/{prog.total}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                        {isRunning && !prog && (
                                            <Badge
                                                variant="secondary"
                                                className="text-[10px] shrink-0 border border-green-400/30 text-green-400 bg-green-400/10"
                                            >
                                                Đang chạy
                                            </Badge>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
