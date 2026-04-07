import { useState, useEffect, useRef, useCallback } from "react"
import { Eye, EyeOff, ArrowLeftRight } from "lucide-react"
import type { Material, BOQItem } from "@/types"
import { MaterialList } from "@/components/MaterialList"
import { BOQTable } from "@/components/BOQTable"
import { ExportButton } from "@/components/ExportButton"
import { Button } from "@/components/ui/button"
import { AIGeneratorDialog } from "@/components/AIGeneratorDialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { loadBOQ, saveBOQ, clearBOQ } from "@/lib/boqService"
import { isSupabaseConfigured } from "@/lib/supabaseClient"

function App() {
  const [boqItems, setBoqItems] = useState<BOQItem[]>([])
  const [boqLoaded, setBoqLoaded] = useState(false)

  // Resizable sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(400)
  const [isResizing, setIsResizing] = useState(false)
  const sidebarRef = useRef<HTMLDivElement>(null)

  const [isPriceVisible, setIsPriceVisible] = useState(false)

  // ── Load BOQ on mount ──────────────────────────────────────────────────────
  useEffect(() => {
    loadBOQ().then(items => {
      setBoqItems(items)
      setBoqLoaded(true)
    })
  }, [])

  // ── Persist BOQ on every change (after initial load) ─────────────────────
  useEffect(() => {
    if (!boqLoaded) return
    saveBOQ(boqItems)
  }, [boqItems, boqLoaded])

  // ── Resize logic ──────────────────────────────────────────────────────────
  const startResizing = useCallback(() => setIsResizing(true), [])
  const stopResizing  = useCallback(() => setIsResizing(false), [])

  const resize = useCallback(
    (e: MouseEvent) => {
      if (!isResizing) return
      const container = sidebarRef.current?.parentElement
      if (container) {
        const newWidth = e.clientX - container.getBoundingClientRect().left
        if (newWidth > 250 && newWidth < Math.min(800, window.innerWidth * 0.6)) {
          setSidebarWidth(newWidth)
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

  // ── BOQ handlers ──────────────────────────────────────────────────────────
  const handleAddMaterial = (material: Material) => {
    setBoqItems(prev => {
      const existing = prev.find(item => item.id === material.id)
      if (existing) {
        return prev.map(item =>
          item.id === material.id ? { ...item, boqQty: item.boqQty + 1 } : item
        )
      }
      return [...prev, { ...material, boqQty: 1 }]
    })
  }

  const handleAddMultipleMaterials = (materials: BOQItem[]) => {
    setBoqItems(prev => [...prev, ...materials])
  }

  const handleUpdateQuantity = (id: string, qty: number) => {
    setBoqItems(prev =>
      prev.map(item => (item.id === id ? { ...item, boqQty: qty } : item))
    )
  }

  const handleRemoveItem = (id: string) => {
    setBoqItems(prev => prev.filter(item => item.id !== id))
  }

  const handleUpdateRemark = (id: string, remark: string) => {
    setBoqItems(prev =>
      prev.map(item => (item.id === id ? { ...item, remarks: remark } : item))
    )
  }

  const handleUpdateMaterial = (updatedMaterial: Material) => {
    setBoqItems(prev =>
      prev.map(item => (item.id === updatedMaterial.id ? { ...item, ...updatedMaterial } : item))
    )
  }

  const handleReorderItems = (reorderedItems: BOQItem[]) => {
    setBoqItems(reorderedItems)
  }

  const handleReset = async () => {
    if (confirm("Are you sure you want to clear the BOQ?")) {
      await clearBOQ()
      setBoqItems([])
    }
  }

  return (
    <div className={`min-h-screen bg-background p-4 md:p-8 ${isResizing ? "cursor-col-resize select-none" : ""}`}>
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Material BOQ</h1>
            <p className="text-muted-foreground">
              Create and manage Bill of Quantities
              {isSupabaseConfigured && (
                <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 inline-block" />
                  Synced to Cloud
                </span>
              )}
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
            className="w-3 bg-transparent hover:bg-primary/10 cursor-col-resize flex items-center justify-center relative group transition-colors -ml-0 z-10 hidden lg:flex"
            onMouseDown={startResizing}
          >
            <div className="absolute inset-y-0 w-px bg-border group-hover:bg-primary/50 transition-colors left-1/2 -translate-x-1/2" />
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
                onUpdateRemark={handleUpdateRemark}
                onUpdateMaterial={handleUpdateMaterial}
                onReorder={handleReorderItems}
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
