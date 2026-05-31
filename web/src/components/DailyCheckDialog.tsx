import { Button } from "@/components/ui/button";
import { CalendarCheck } from "lucide-react";

interface Props {
    profileCount: number | undefined;
    onCheckAll: () => void;
    onDismiss: () => void;
}

export function DailyCheckDialog({ profileCount, onCheckAll, onDismiss }: Props) {
    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden animate-slide-up">
                <div className="bg-gradient-to-br from-primary/15 via-primary/8 to-transparent border-b border-border px-6 pt-5 pb-4 flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                        <CalendarCheck className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                        <h2 className="font-semibold text-base">Kiểm tra điểm hôm nay?</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {profileCount ?? "..."} profile chưa được kiểm tra.
                        </p>
                    </div>
                </div>
                <div className="p-4 flex gap-2">
                    <Button className="flex-1" onClick={onCheckAll}>
                        Kiểm tra ngay
                    </Button>
                    <Button variant="outline" className="flex-1" onClick={onDismiss}>
                        Để sau
                    </Button>
                </div>
            </div>
        </div>
    );
}
