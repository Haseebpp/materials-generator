import * as React from "react"

import { cn } from "@/lib/utils"

const ScrollArea = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement> & { fadeColor?: string }
>(({ className, children, fadeColor, ...props }, ref) => {
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const [showFade, setShowFade] = React.useState(false)

    // Sync the forwarded ref with our local ref
    React.useImperativeHandle(ref, () => scrollRef.current!)

    const checkScroll = React.useCallback(() => {
        const element = scrollRef.current
        if (!element) return

        const { scrollTop, scrollHeight, clientHeight } = element
        // Show fade if we're not at the bottom (with a small buffer)
        // and there is actually content to scroll
        const isScrollable = scrollHeight > clientHeight
        const isAtBottom = Math.ceil(scrollTop + clientHeight) >= scrollHeight - 1

        setShowFade(isScrollable && !isAtBottom)
    }, [])

    React.useEffect(() => {
        const element = scrollRef.current
        if (!element) return

        checkScroll()
        element.addEventListener("scroll", checkScroll)
        // Resize observer to check if content changed
        const resizeObserver = new ResizeObserver(() => checkScroll())
        resizeObserver.observe(element)

        return () => {
            element.removeEventListener("scroll", checkScroll)
            resizeObserver.disconnect()
        }
    }, [checkScroll, children]) // Re-check when children change

    return (
        <div className={cn("relative overflow-hidden", className)}>
            <div
                ref={scrollRef}
                className="h-full w-full overflow-auto scrollbar-win11"
                {...props}
            >
                {children}
            </div>
            <div
                className={cn(
                    "pointer-events-none absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background to-transparent transition-opacity duration-300",
                    showFade ? "opacity-100" : "opacity-0",
                    fadeColor // Allow custom color override
                )}
            />
        </div>
    )
})
ScrollArea.displayName = "ScrollArea"

const ScrollBar = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
    <div ref={ref} className={cn("", className)} {...props} />
))
ScrollBar.displayName = "ScrollBar"

export { ScrollArea, ScrollBar }
