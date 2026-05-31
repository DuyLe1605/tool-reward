import { useEffect, useRef } from "react";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { Trash2, Terminal } from "lucide-react";

export function LogConsole() {
    const logs = useAppStore((s) => s.logs);
    const clearLogs = useAppStore((s) => s.clearLogs);
    const bottomRef = useRef<HTMLDivElement>(null);
    const autoScrollRef = useRef(true);

    // Auto-scroll xuống cuối khi có log mới — cuộn trong viewport của ScrollArea, không cuộn trang
    useEffect(() => {
        if (!autoScrollRef.current) return;
        const viewport = bottomRef.current?.closest("[data-radix-scroll-area-viewport]") as HTMLElement | null;
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
    }, [logs]);

    return (
        <Card className="flex flex-col h-full">
            <div className="flex items-center justify-between px-4 py-2.5 border-b border-border flex-shrink-0">
                <span className="text-sm font-medium flex items-center gap-2">
                    <Terminal className="w-4 h-4" />
                    Log
                    <span className="text-xs font-normal text-muted-foreground">({logs.length})</span>
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={clearLogs} title="Xóa log">
                    <Trash2 className="w-3.5 h-3.5" />
                </Button>
            </div>
            <CardContent className="flex-1 min-h-0 p-0 overflow-hidden">
                <ScrollArea className="h-full px-4 pb-4 scrollbar-thin">
                    {logs.length === 0 ? (
                        <p className="text-xs text-muted-foreground py-4 text-center">Chưa có log...</p>
                    ) : (
                        <div className="font-mono text-[11px] space-y-0.5 pt-2">
                            {logs.map((line) => (
                                <div key={line.id} className={cn("flex items-start gap-2 leading-5 break-all")}>
                                    <span
                                        className={cn(
                                            "w-1.5 h-1.5 rounded-full mt-1.5 shrink-0",
                                            line.level === "error" && "bg-red-500",
                                            line.level === "success" && "bg-emerald-500",
                                            line.level === "info" && "bg-muted-foreground/30",
                                        )}
                                    />
                                    <span>
                                        <span className="text-muted-foreground/50 select-none mr-1.5">
                                            {new Date(line.timestamp).toLocaleTimeString("vi-VN", { hour12: false })}
                                        </span>
                                        <span
                                            className={cn(
                                                line.level === "error" && "text-red-400",
                                                line.level === "success" && "text-emerald-400",
                                                line.level === "info" && "text-muted-foreground",
                                            )}
                                        >
                                            {line.message}
                                        </span>
                                    </span>
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>
                    )}
                </ScrollArea>
            </CardContent>
        </Card>
    );
}
