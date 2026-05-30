import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { api } from "@/api";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Play, Square, ChevronUp, ChevronDown, Shuffle, BarChart2, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function ControlPanel() {
    const qc = useQueryClient();
    const { data: status } = useQuery({
        queryKey: ["status"],
        queryFn: api.getStatus,
        refetchInterval: (query) => (query.state.data?.running ? 1000 : 2000),
    });

    const { maxSearches, mode, selectedIndices, setMaxSearches, setMode } = useAppStore();
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

    const startMutation = useMutation({
        mutationFn: () => api.startTask({ profileIndices: selectedIndices, maxSearches, mode }),
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

    const progressEntries = Object.values(status?.progress ?? {});
    const totalDone = progressEntries.reduce((s, p) => s + p.done, 0);
    const totalMax = progressEntries.reduce((s, p) => s + p.total, 0);
    const percent = totalMax > 0 ? Math.round((totalDone / totalMax) * 100) : 0;

    return (
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm">Điều khiển</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
                {/* Số lượt search — stepper gộp 1 ô */}
                <div>
                    <label className="text-xs text-muted-foreground mb-1.5 block">Số lượt search / profile</label>
                    <div className="flex items-center h-9 rounded-lg border border-border bg-input/30 overflow-hidden w-full">
                        <button
                            className="h-full px-2.5 flex items-center justify-center hover:bg-accent text-muted-foreground hover:text-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            onClick={() => setMaxSearches(Math.max(0, maxSearches - 5))}
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
                            onClick={() => setMaxSearches(maxSearches + 5)}
                            disabled={running}
                        >
                            <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </div>

                {/* Chế độ — segmented control */}
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

                {/* Tiến độ — chỉ hiện khi đang chạy */}
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

                {/* Nút hành động */}
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
                        </Button>
                        <button
                            onClick={() => checkPointsMutation.mutate()}
                            disabled={selectedIndices.length === 0 || checkPointsMutation.isPending}
                            className="w-full flex items-center justify-center gap-2 rounded-lg border border-border py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        >
                            <BarChart2 className="w-3.5 h-3.5" />
                            Kiểm tra điểm
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

                {/* Overlay toàn trang khi đang dừng */}
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

                {(startMutation.isError || checkPointsMutation.isError) && (
                    <p className="text-xs text-destructive">
                        {((startMutation.error ?? checkPointsMutation.error) as Error).message}
                    </p>
                )}
            </CardContent>
        </Card>
    );
}
