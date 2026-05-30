import { cn } from "@/lib/utils";

function ScrollArea({
    className,
    children,
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { ref?: React.Ref<HTMLDivElement> }) {
    return (
        <div data-slot="scroll-area" className={cn("relative overflow-y-auto scrollbar-thin", className)} {...props}>
            {children}
        </div>
    );
}

export { ScrollArea };

import React from "react";
