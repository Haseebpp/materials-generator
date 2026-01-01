import { Download } from "lucide-react"
import * as XLSX from "xlsx"
import type { BOQItem } from "@/types"
import { Button } from "@/components/ui/button"

interface ExportButtonProps {
    items: BOQItem[]
}

export function ExportButton({ items }: ExportButtonProps) {
    const handleExport = () => {
        if (items.length === 0) return

        const data = items.map((item) => ({
            ID: item.id,
            Category: item.category,
            Description: item.description,
            Unit: item.unit,
            Rate: item.rate,
            Quantity: item.boqQty,
            Total: (
                parseFloat(item.rate.replace(/[^0-9.]/g, "")) * item.boqQty
            ).toFixed(2),
        }))

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(data)

        // Add summary row
        const totalAmount = data.reduce((sum, row) => sum + parseFloat(row.Total), 0)
        XLSX.utils.sheet_add_aoa(ws, [["", "", "", "", "", "Grand Total", totalAmount.toFixed(2)]], { origin: -1 })

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
