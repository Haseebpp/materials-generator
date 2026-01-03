import { Download } from "lucide-react"
import * as XLSX from "xlsx"
import type { BOQItem } from "@/types"
import { Button } from "@/components/ui/button"

interface ExportButtonProps {
    items: BOQItem[]
    isPriceVisible: boolean
}

export function ExportButton({ items, isPriceVisible }: ExportButtonProps) {
    const handleExport = () => {
        if (items.length === 0) return

        const data = items.map((item) => {
            const baseItem = {
                ID: item.id,
                Category: item.category,
                Description: item.description,
                Quantity: item.boqQty,
                Unit: item.unit,
            }

            if (isPriceVisible) {
                return {
                    ...baseItem,
                    Rate: item.rate,
                    Total: (
                        parseFloat(item.rate.replace(/[^0-9.]/g, "")) * item.boqQty
                    ).toFixed(2),
                }
            }

            return baseItem
        })

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(data)

        // Add summary row only if price is visible
        if (isPriceVisible) {
            const totalAmount = data.reduce((sum, row) => sum + parseFloat((row as any).Total || "0"), 0)
            XLSX.utils.sheet_add_aoa(ws, [["", "", "", "", "", "Grand Total", totalAmount.toFixed(2)]], { origin: -1 })
        }

        XLSX.utils.book_append_sheet(wb, ws, "BOQ")
        XLSX.writeFile(wb, "Materials_BOQ.xlsx")
    }

    return (
        <Button onClick={handleExport} disabled={items.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export to Excel
        </Button>
    )
}
