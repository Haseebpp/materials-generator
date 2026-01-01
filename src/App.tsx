import { useState, useEffect } from "react"
import { Eye, EyeOff } from "lucide-react"
import type { Material, BOQItem } from "@/types"
import { MaterialList } from "@/components/MaterialList"
import { BOQTable } from "@/components/BOQTable"
import { ExportButton } from "@/components/ExportButton"
import { Button } from "@/components/ui/button"



function App() {
  const [boqItems, setBoqItems] = useState<BOQItem[]>(() => {
    const saved = localStorage.getItem("boqItems")
    return saved ? JSON.parse(saved) : []
  })

  const [isPriceVisible, setIsPriceVisible] = useState(false)

  useEffect(() => {
    localStorage.setItem("boqItems", JSON.stringify(boqItems))
  }, [boqItems])

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
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="mx-auto max-w-[1400px] space-y-6">
        <header className="flex items-center justify-between border-b pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Material BOQ</h1>
            <p className="text-muted-foreground">
              Create and manage Bill of Quantities
            </p>
          </div>
          <div className="flex gap-2">
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
            <ExportButton items={boqItems} />
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[400px_1fr] h-[calc(100vh-200px)]">
          <aside className="h-full overflow-hidden hidden lg:block">
            <MaterialList onAdd={handleAddMaterial} isPriceVisible={isPriceVisible} />
          </aside>
          <main className="h-full overflow-auto space-y-4 col-span-2 lg:col-span-1">
            <BOQTable
              items={boqItems}
              onUpdateQuantity={handleUpdateQuantity}
              onRemove={handleRemoveItem}
              onAddMaterial={handleAddMaterial}
              isPriceVisible={isPriceVisible}
            />
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
