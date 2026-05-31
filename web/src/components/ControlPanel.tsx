import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { api } from "@/api";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
    Play,
    Square,
    ChevronUp,
    ChevronDown,
    Shuffle,
    BarChart2,
    Loader2,
    Monitor,
    Smartphone,
    MonitorSmartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

export function ControlPanel() {
    const qc = useQueryClient();
    const { data: status } = useQuery({
        queryKey: ["status"],
        queryFn: api.getStatus,
        refetchInterval: (query) => (query.state.data?.running ? 1000 : 2000),
    });

    const {
        maxSearches,
        mobileSearches,
        searchType,
        mode,
        selectedIndices,
        setMaxSearches,
        setMobileSearches,
        setSearchType,
        setMode,
    } = useAppStore();
    const running = status?.running ?? false;
    const [stopping, setStopping] = useState(false);

    // Reset overlay khi server xác nhận đã dừng hẳn
    useEffect(() => {
        if (!running) setStopping(false);
    }, [running]);

    // Local string state cho input — cho phép xóa hết rồi gõ số mới
    const [inputValue, setInputValue] = useState(String(maxSearches));
    const commitInput = (raw: string) => {
        const v = parseInt(raw, 10);
        const clamped = isNaN(v) || v < 0 ? 0 : v;
        setMaxSearches(clamped);
        setInputValue(String(clamped));
    };

    const [mobileInputValue, setMobileInputValue] = useState(String(mobileSearches));
    const commitMobileInput = (raw: string) => {
        const v = parseInt(raw, 10);
        const clamped = isNaN(v) || v < 0 ? 0 : Math.min(v, 20);
        setMobileSearches(clamped);
        setMobileInputValue(String(clamped));
    };

    const startMutation = useMutation({
        mutationFn: () =>
            api.startTask({ profileIndices: selectedIndices, maxSearches, mobileSearches, mode, searchType }),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["status"] }),
    });

    const checkPointsMutation = useMutation({
        mutationFn: () => api.checkPoints(selectedIndices),
        onSuccess: () => qc.invalidateQueries({ queryKey: ["status"] }),
    });

    const stopMutation = useMutation({
        mutationFn: api.stopTask,
        onSuccess: () => qc.invalidateQueries({ queryKey: ["status"] }),
    });

    // Toast khi có lỗi
    useEffect(() => {
        if (startMutation.isError) toast.error((startMutation.error as Error).message);
    }, [startMutation.isError, startMutation.error]);
    useEffect(() => {
        if (checkPointsMutation.isError) toast.error((checkPointsMutation.error as Error).message);
    }, [checkPointsMutation.isError, checkPointsMutation.error]);

    // Keyboard shortcuts: Ctrl+Enter → Start/Stop, Ctrl+K → Check points
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key === "Enter") {
                e.preventDefault();
                if (running) {
                    setStopping(true);
                    stopMutation.mutate();
                } else if (selectedIndices.length > 0 && !startMutation.isPending) {
                    startMutation.mutate();
                }
            }
            if (e.ctrlKey && e.key === "k") {
                e.preventDefault();
                if (!running && selectedIndices.length > 0 && !checkPointsMutation.isPending) {
                    checkPointsMutation.mutate();
                }
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [running, selectedIndices, startMutation, stopMutation, checkPointsMutation]);

    const progressEntries = Object.values(status?.progress ?? {});
    const totalDone = progressEntries.reduce((s, p) => s + p.done, 0);
    const totalMax = progressEntries.reduce((s, p) => s + p.total, 0);
    const percent = totalMax > 0 ? Math.round((totalDone / totalMax) * 100) : 0;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">Điều khiển</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {/* ── Loại tìm kiếm ──────────────────────────────────── */}
                <div>
                    <label className="text-xs text-muted-foreground mb-2 block">Loại tìm kiếm</label>
                    <div className="grid grid-cols-3 gap-1.5">
                        {(["desktop", "mobile", "both"] as const).map((t) => {
                            const icons = {
                                desktop: <Monitor className="w-4 h-4" />,
                                mobile: <Smartphone className="w-4 h-4" />,
                                both: <MonitorSmartphone className="w-4 h-4" />,
                            };
                            const labels = { desktop: "Desktop", mobile: "Mobile", both: "Cả hai" };
                            const pts = { desktop: "90 pts", mobile: "60 pts", both: "150 pts" };
                            const active = searchType === t;
                            return (
                                <button
                                    key={t}
                                    onClick={() => !running && setSearchType(t)}
                                    disabled={running}
                                    className={cn(
                                        "flex flex-col items-center gap-1 rounded-xl border py-2.5 px-1 text-xs font-medium transition-all",
                                        active
                                            ? "border-primary/50 bg-primary/10 text-primary"
                                            : "border-border bg-muted/30 text-muted-foreground hover:border-border hover:bg-muted/60 hover:text-foreground",
                                        running && "cursor-not-allowed opacity-50",
                                    )}
                                >
                                    {icons[t]}
                                    <span>{labels[t]}</span>
                                    <span
                                        className={cn(
                                            "text-[10px] font-mono",
                                            active ? "text-primary/70" : "text-muted-foreground/60",
                                        )}
                                    >
                                        {pts[t]}
                                    </span>
                                </button>
                            );
                        })}
                    </div>
                </div>

                {/* ── Số lượt search ──────────────────────────────────── */}
                <div className="space-y-2.5">
                    {/* Desktop stepper */}
                    {(searchType === "desktop" || searchType === "both") && (
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                <Monitor className="w-3 h-3" /> Desktop search / profile
                                <span className="ml-auto font-mono text-[10px] text-muted-foreground/60">
                                    max ~90 pts
                                </span>
                            </label>
                            <div className="flex items-center h-9 rounded-lg border border-border bg-input/30 overflow-hidden w-full">
                                <button
                                    className="h-full px-2.5 flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    onClick={() => {
                                        const v = Math.max(0, maxSearches - 5);
                                        setMaxSearches(v);
                                        setInputValue(String(v));
                                    }}
                                    disabled={running}
                                >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <div className="w-px h-5 bg-border" />
                                <input
                                    type="number"
                                    value={inputValue}
                                    min={0}
                                    disabled={running}
                                    onChange={(e) => setInputValue(e.target.value)}
                                    onBlur={(e) => commitInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && commitInput(inputValue)}
                                    className="flex-1 text-center font-mono text-sm font-semibold bg-transparent px-1 py-0 focus:outline-none text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <div className="w-px h-5 bg-border" />
                                <button
                                    className="h-full px-2.5 flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    onClick={() => {
                                        const v = maxSearches + 5;
                                        setMaxSearches(v);
                                        setInputValue(String(v));
                                    }}
                                    disabled={running}
                                >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Mobile stepper */}
                    {(searchType === "mobile" || searchType === "both") && (
                        <div>
                            <label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1.5">
                                <Smartphone className="w-3 h-3" /> Mobile search / profile
                                <span className="ml-auto font-mono text-[10px] text-muted-foreground/60">
                                    tối đa 20
                                </span>
                            </label>
                            <div className="flex items-center h-9 rounded-lg border border-border bg-input/30 overflow-hidden w-full">
                                <button
                                    className="h-full px-2.5 flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    onClick={() => {
                                        const v = Math.max(0, mobileSearches - 5);
                                        setMobileSearches(v);
                                        setMobileInputValue(String(v));
                                    }}
                                    disabled={running}
                                >
                                    <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                                <div className="w-px h-5 bg-border" />
                                <input
                                    type="number"
                                    value={mobileInputValue}
                                    min={0}
                                    max={20}
                                    disabled={running}
                                    onChange={(e) => setMobileInputValue(e.target.value)}
                                    onBlur={(e) => commitMobileInput(e.target.value)}
                                    onKeyDown={(e) => e.key === "Enter" && commitMobileInput(mobileInputValue)}
                                    className="flex-1 text-center font-mono text-sm font-semibold bg-transparent px-1 py-0 focus:outline-none text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <div className="w-px h-5 bg-border" />
                                <button
                                    className="h-full px-2.5 flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                    onClick={() => {
                                        const v = Math.min(20, mobileSearches + 5);
                                        setMobileSearches(v);
                                        setMobileInputValue(String(v));
                                    }}
                                    disabled={running}
                                >
                                    <ChevronUp className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* ── Chế độ chạy ──────────────────────────────────────── */}
                <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Chế độ chạy</label>
                    <div className="flex gap-1 p-1 rounded-lg bg-muted/60 border border-border">
                        {(["s", "p"] as const).map((m) => (
                            <button
                                key={m}
                                onClick={() => !running && setMode(m)}
                                disabled={running}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-1.5 rounded-md py-1.5 text-xs font-medium transition-all",
                                    mode === m
                                        ? "bg-background text-foreground shadow-sm"
                                        : "text-muted-foreground hover:text-foreground",
                                    running && "cursor-not-allowed opacity-50",
                                )}
                            >
                                {m === "s" ? (
                                    <>
                                        <Play className="w-3 h-3" />
                                        Lần lượt
                                    </>
                                ) : (
                                    <>
                                        <Shuffle className="w-3 h-3" />
                                        Song song
                                    </>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Tiến độ ──────────────────────────────────────────── */}
                {running && totalMax > 0 && (
                    <div className="rounded-lg bg-muted/40 border border-border px-3 py-2">
                        <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                            <span>Tiến độ tổng</span>
                            <span className="font-mono font-medium text-foreground">
                                {totalDone}/{totalMax}
                                <span className="text-muted-foreground ml-1">({percent}%)</span>
                            </span>
                        </div>
                        <Progress value={percent} className="h-1.5" />
                    </div>
                )}

                {/* ── Nút hành động ─────────────────────────────────────── */}
                {!running ? (
                    <div className="flex flex-col gap-2 pt-1">
                        <Button
                            className="w-full gap-2"
                            onClick={() => startMutation.mutate()}
                            disabled={selectedIndices.length === 0 || startMutation.isPending}
                        >
                            <Play className="w-3.5 h-3.5" />
                            {selectedIndices.length === 0
                                ? "Chọn ít nhất 1 profile"
                                : `Bắt đầu ${selectedIndices.length} profile`}
                            <kbd className="ml-auto text-[10px] font-mono opacity-40 tracking-tight">⌃↵</kbd>
                        </Button>
                        <button
                            onClick={() => checkPointsMutation.mutate()}
                            disabled={selectedIndices.length === 0 || checkPointsMutation.isPending}
                            className="w-full flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <BarChart2 className="w-3.5 h-3.5" />
                            Kiểm tra điểm
                            <kbd className="ml-auto text-[10px] font-mono opacity-40 tracking-tight">⌃K</kbd>
                        </button>
                    </div>
                ) : (
                    <Button
                        variant="destructive"
                        className="w-full gap-2 mt-1"
                        onClick={() => {
                            setStopping(true);
                            stopMutation.mutate();
                        }}
                        disabled={stopping}
                    >
                        {stopping ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Square className="w-3.5 h-3.5" />
                        )}
                        {stopping ? "Đang dừng..." : "Dừng lại"}
                    </Button>
                )}

                {stopping && (
                    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                        <div className="bg-card border border-border rounded-2xl shadow-2xl px-8 py-7 flex flex-col items-center gap-4 min-w-55">
                            <Loader2 className="w-10 h-10 text-primary animate-spin" />
                            <div className="text-center">
                                <p className="font-semibold text-sm">Đang dừng tiến trình</p>
                                <p className="text-xs text-muted-foreground mt-1">Chờ tác vụ hiện tại hoàn thành...</p>
                            </div>
                        </div>
                    </div>
                )}

                {(startMutation.isError || checkPointsMutation.isError) && null}
            </CardContent>
        </Card>
    );
}
