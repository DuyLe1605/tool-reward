import { QueryClient, QueryClientProvider, useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { ProfileList } from "@/components/ProfileList";
import { ControlPanel } from "@/components/ControlPanel";
import { LogConsole } from "@/components/LogConsole";
import { ProgressPanel } from "@/components/ProgressPanel";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAppStore } from "@/store/useAppStore";
import { api } from "@/api";
import { Button } from "@/components/ui/button";

const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: 1 } },
});

function AppInner() {
    const theme = useAppStore((s) => s.theme);
    const setLastCheckedDate = useAppStore((s) => s.setLastCheckedDate);
    const setPoints = useAppStore((s) => s.setPoints);
    const [showDailyDialog, setShowDailyDialog] = useState(false);
    useWebSocket();

    const today = new Date().toDateString();
    const { data: profiles } = useQuery({ queryKey: ["profiles"], queryFn: api.getProfiles });
    const checkMutation = useMutation({ mutationFn: api.checkPoints });
    const markCheckedMutation = useMutation({ mutationFn: api.markChecked });

    // Tải state từ server khi khởi động (hoạt động cả InPrivate)
    const { data: serverState } = useQuery({ queryKey: ["appState"], queryFn: api.getAppState });

    useEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark");
    }, [theme]);

    useEffect(() => {
        if (!serverState) return;
        // Đồng bộ points từ server vào store
        if (Object.keys(serverState.points).length > 0) {
            setPoints(serverState.points);
        }
        // Hiện dialog nếu chưa kiểm tra hôm nay
        if (serverState.lastCheckedDate !== today) {
            setLastCheckedDate("");
            setShowDailyDialog(true);
        } else {
            setLastCheckedDate(today);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [serverState]);

    const handleCheckAll = () => {
        markCheckedMutation.mutate();
        setLastCheckedDate(today);
        setShowDailyDialog(false);
        if (profiles?.length) checkMutation.mutate(profiles.map((_, i) => i));
    };
    const handleDismiss = () => {
        markCheckedMutation.mutate();
        setLastCheckedDate(today);
        setShowDailyDialog(false);
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <Header />
            <main className="flex-1 max-w-[1400px] mx-auto w-full px-3 py-3 grid grid-cols-1 lg:grid-cols-[280px_1fr_260px] gap-3">
                {/* Cột trái: profile + điều khiển */}
                <div className="flex flex-col gap-3">
                    <ProfileList />
                    <ControlPanel />
                </div>
                {/* Cột giữa: log */}
                <div className="lg:h-[calc(100vh-4.5rem)] flex flex-col">
                    <LogConsole />
                </div>
                {/* Cột phải: tiến độ + điểm */}
                <div className="flex flex-col gap-3">
                    <ProgressPanel />
                </div>
            </main>

            {/* Dialog kiểm tra điểm đầu ngày */}
            {showDailyDialog && (
                <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
                    <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
                        <div className="flex items-center gap-3">
                            <span className="text-3xl">🪙</span>
                            <div>
                                <h2 className="font-semibold text-base">Kiểm tra điểm hôm nay?</h2>
                                <p className="text-sm text-muted-foreground mt-0.5">
                                    Tự động kiểm tra điểm tất cả {profiles?.length ?? "..."} profile.
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <Button className="flex-1" onClick={handleCheckAll}>
                                Kiểm tra ngay
                            </Button>
                            <Button variant="outline" className="flex-1" onClick={handleDismiss}>
                                Để sau
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default function App() {
    return (
        <QueryClientProvider client={queryClient}>
            <AppInner />
        </QueryClientProvider>
    );
}
