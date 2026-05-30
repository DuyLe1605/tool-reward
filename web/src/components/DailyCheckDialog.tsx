import { Button } from "@/components/ui/button";

interface Props {
    profileCount: number | undefined;
    onCheckAll: () => void;
    onDismiss: () => void;
}

export function DailyCheckDialog({ profileCount, onCheckAll, onDismiss }: Props) {
    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-card border border-border rounded-xl shadow-xl w-full max-w-sm p-6 flex flex-col gap-4">
                <div className="flex items-center gap-3">
                    <span className="text-3xl">🪙</span>
                    <div>
                        <h2 className="font-semibold text-base">Kiểm tra điểm hôm nay?</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            Tự động kiểm tra điểm tất cả {profileCount ?? "..."} profile.
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
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
