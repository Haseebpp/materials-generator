import { useState, useEffect, useRef, useCallback } from "react"
import { Eye, EyeOff, ArrowLeftRight } from "lucide-react"
import type { Material, BOQItem } from "@/types"
import { MaterialList } from "@/components/MaterialList"
import { BOQTable } from "@/components/BOQTable"
import { ExportButton } from "@/components/ExportButton"
import { Button } from "@/components/ui/button"
import { AIGeneratorDialog } from "@/components/AIGeneratorDialog"
import { ScrollArea } from "@/components/ui/scroll-area"

function App() {
  const [boqItems, setBoqItems] = useState<BOQItem[]>(() => {
    const saved = localStorage.getItem("boqItems")
    return saved ? JSON.parse(saved) : []
  })

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(400)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const [isPriceVisible, setIsPriceVisible] = useState(false)

  useEffect(() => {
    localStorage.setItem("boqItems", JSON.stringify(boqItems))
  }, [boqItems])

  const startResizing = useCallback(() => {
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        // Calculate new width based on mouse position
        // The sidebar is the first element, so its width is roughly mouseX - containerLeft
        // But we can just use clientX if the container is near the edge, or be more precise:
        // Let's get the container's left offset
        const container = sidebarRef.current?.parentElement
        if (container) {
          const containerLeft = container.getBoundingClientRect().left
          const newWidth = mouseMoveEvent.clientX - containerLeft
          // Min 250px, Max 800px or 50% of screen
          if (newWidth > 250 && newWidth < Math.min(800, window.innerWidth * 0.6)) {
            setSidebarWidth(newWidth)
          }
        }
      }
    },
    [isResizing]
  )

  useEffect(() => {
    window.addEventListener("mousemove", resize)
    window.addEventListener("mouseup", stopResizing)
    return () => {
      window.removeEventListener("mousemove", resize)
      window.removeEventListener("mouseup", stopResizing)
    }
  }, [resize, stopResizing])


  const handleAddMaterial = (material: Material) => {
    setBoqItems((prev) => {
      const existing = prev.find((item) => item.id === material.id)
      if (existing) {
        return prev.map((item) =>
          item.id === material.id
            ? { ...item, boqQty: item.boqQty + 1 }
            : item
        )
      }
      return [...prev, { ...material, boqQty: 1 }]
    })
  }

  const handleAddMultipleMaterials = (materials: BOQItem[]) => {
    setBoqItems(prev => [...prev, ...materials]);
  }

  const handleUpdateQuantity = (id: string, qty: number) => {
    setBoqItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, boqQty: qty } : item))
    )
  }

  const handleRemoveItem = (id: string) => {
    setBoqItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleReset = () => {
    if (confirm("Are you sure you want to clear the BOQ?")) {
      setBoqItems([])
    }
  }

  return (
    <div className={`min-h-screen bg-background p-4 md:p-8 ${isResizing ? 'cursor-col-resize select-none' : ''}`}>
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Material BOQ</h1>
            <p className="text-muted-foreground">
              Create and manage Bill of Quantities
            </p>
          </div>
          <div className="flex gap-2">
            <AIGeneratorDialog onAddMaterials={handleAddMultipleMaterials} />
            <Button
              variant="outline"
              size="icon"
              onClick={() => setIsPriceVisible(!isPriceVisible)}
              title={isPriceVisible ? "Hide Prices" : "Show Prices"}
            >
              {isPriceVisible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="outline" onClick={handleReset} disabled={boqItems.length === 0}>
              Clear All
            </Button>
            <ExportButton items={boqItems} isPriceVisible={isPriceVisible} />
          </div>
        </header>

        <div className="flex h-[calc(100vh-170px)] overflow-hidden rounded-lg bg-card">
          <aside
            ref={sidebarRef}
            className="flex-shrink-0 bg-muted/10 h-full overflow-hidden hidden lg:block"
            style={{ width: sidebarWidth }}
          >
            <MaterialList onAdd={handleAddMaterial} isPriceVisible={isPriceVisible} />
          </aside>

          {/* Resizable Handle */}
          <div
            className="w-4 bg-transparent hover:bg-primary/10 cursor-col-resize flex items-center justify-center relative group transition-colors -ml-2 z-10 hidden lg:flex"
            onMouseDown={startResizing}
          >
            {/* Visible line */}
            <div className="absolute inset-y-0 w-px bg-border group-hover:bg-primary/50 transition-colors left-1/2 -translate-x-1/2" />

            {/* Round handle with arrow */}
            <div className="bg-background border shadow-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity absolute pointer-events-none transform -translate-x-1 shadow-md">
              <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
            </div>
          </div>

          <main className="flex-1 min-w-0 h-full bg-background">
            <ScrollArea className="h-full">
              <BOQTable
                items={boqItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemove={handleRemoveItem}
                onAddMaterial={handleAddMaterial}
                isPriceVisible={isPriceVisible}
              />
            </ScrollArea>
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
