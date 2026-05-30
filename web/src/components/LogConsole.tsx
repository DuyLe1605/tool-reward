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

    // Auto-scroll xuống cuối khi có log mới
    useEffect(() => {
        if (autoScrollRef.current) {
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
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
                        <div className="font-mono text-[11px] space-y-0.5">
                            {logs.map((line) => (
                                <div
                                    key={line.id}
                                    className={cn(
                                        "leading-5 break-all",
                                        line.level === "error" && "text-red-500",
                                        line.level === "success" && "text-green-500",
                                        line.level === "info" && "text-muted-foreground",
                                    )}
                                >
                                    <span className="text-muted-foreground/50 select-none mr-1.5">
                                        {new Date(line.timestamp).toLocaleTimeString("vi-VN", { hour12: false })}
                                    </span>
                                    {line.message}
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
