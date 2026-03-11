"use client"

import * as React from "react"

function Separator({
    className,
    orientation = "horizontal",
    ...props
}: React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }) {
    return (
        <div
            role="separator"
            className={[
                "shrink-0 bg-border",
                orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
                className
            ].filter(Boolean).join(" ")}
            {...props}
        />
    )
}

export { Separator }
