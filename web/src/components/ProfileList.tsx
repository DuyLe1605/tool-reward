import { useQuery } from "@tanstack/react-query";
import { api } from "@/api";
import { useAppStore } from "@/store/useAppStore";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

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
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-sm flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Profiles Edge
                    <Badge variant="secondary" className="ml-auto">
                        {profiles.length}
                    </Badge>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 text-[10px]"
                        onClick={toggleAll}
                        disabled={running || profiles.length === 0}
                    >
                        {allSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                    </Button>
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
                <ScrollArea className="h-80">
                    {isLoading ? (
                        <div className="px-4 py-8 text-center text-xs text-muted-foreground">Đang tải...</div>
                    ) : (
                        <ul className="divide-y divide-border">
                            {profiles.map((p, idx) => {
                                const isSelected = selectedIndices.includes(idx);
                                const prog = status?.progress?.[p.name];
                                const isRunning = running && status?.profiles?.some((sp) => sp.name === p.name);

                                return (
                                    <li
                                        key={p.folder}
                                        className={cn(
                                            "flex items-center gap-3 px-4 py-2.5 transition-colors",
                                            isSelected && "bg-primary/5",
                                            running && "opacity-60",
                                        )}
                                    >
                                        <Switch
                                            checked={isSelected}
                                            onCheckedChange={() => !running && toggle(idx)}
                                            disabled={running}
                                            className="shrink-0"
                                        />
                                        <div className="min-w-0 flex-1">
                                            <p className="text-xs font-medium text-foreground truncate">{p.name}</p>
                                            <p className="text-xs text-muted-foreground truncate">{p.email}</p>
                                        </div>
                                        {isRunning && prog && (
                                            <span className="text-xs text-primary font-mono shrink-0">
                                                {prog.done}/{prog.total}
                                            </span>
                                        )}
                                        {isRunning && !prog && (
                                            <Badge variant="secondary" className="text-[10px] shrink-0">
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
