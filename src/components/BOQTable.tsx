import { Trash2 } from "lucide-react"
import type { BOQItem, Material } from "@/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { MaterialCombobox } from "./MaterialCombobox"

interface BOQTableProps {
    items: BOQItem[]
    onUpdateQuantity: (id: string, qty: number) => void
    onRemove: (id: string) => void
    onAddMaterial: (material: Material) => void
    isPriceVisible: boolean
}

export function BOQTable({ items, onUpdateQuantity, onRemove, onAddMaterial, isPriceVisible }: BOQTableProps) {
    const parseRate = (rateStr: string) => {
        const num = parseFloat(rateStr.replace(/[^0-9.]/g, ""))
        return isNaN(num) ? 0 : num
    }

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat("en-SA", {
            style: "currency",
            currency: "SAR",
        }).format(amount)
    }

    const calculateTotal = (items: BOQItem[]) => {
        return items.reduce((sum, item) => {
            return sum + parseRate(item.rate) * item.boqQty
        }, 0)
    }

    return (
        <div className="rounded-md border bg-card shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[80px]">ID</TableHead>
                        <TableHead className="w-[40%]">Description</TableHead>
                        <TableHead>Category</TableHead>
                        {isPriceVisible && <TableHead className="text-right">Rate</TableHead>}
                        <TableHead className="w-[100px] text-right">Qty</TableHead>
                        {isPriceVisible && <TableHead className="text-right">Total</TableHead>}
                        <TableHead className="w-[50px]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => {
                        const rate = parseRate(item.rate)
                        const total = rate * item.boqQty

                        return (
                            <TableRow key={item.id}>
                                <TableCell className="font-mono text-xs">{item.id}</TableCell>
                                <TableCell className="font-medium text-sm">
                                    <div className="flex flex-col">
                                        <span>{item.description}</span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {Object.entries(item.details)
                                                .filter(([_, value]) => value) // Only showing non-empty values
                                                .map(([key, value]) => {
                                                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                                                    return `${label}: ${value}`
                                                })
                                                .join(" • ")}
                                        </span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-xs text-muted-foreground">{item.category}</TableCell>
                                {isPriceVisible && (
                                    <TableCell className="text-right font-mono text-xs">
                                        {formatCurrency(rate)}
                                    </TableCell>
                                )}
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-2">
                                        <Input
                                            type="number"
                                            min="1"
                                            className="h-8 w-20 text-right"
                                            value={item.boqQty}
                                            onChange={(e) =>
                                                onUpdateQuantity(
                                                    item.id,
                                                    Math.max(1, parseInt(e.target.value) || 0)
                                                )
                                            }
                                        />
                                        <span className="text-xs text-muted-foreground whitespace-nowrap min-w-[2rem] text-left">
                                            {item.unit}
                                        </span>
                                    </div>
                                </TableCell>
                                {isPriceVisible && (
                                    <TableCell className="text-right font-mono text-xs font-bold">
                                        {formatCurrency(total)}
                                    </TableCell>
                                )}
                                <TableCell>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => onRemove(item.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )
                    })}

                    <TableRow className="bg-muted/30 hover:bg-muted/50">
                        <TableCell colSpan={2} className="p-2">
                            <MaterialCombobox onSelect={onAddMaterial} isPriceVisible={isPriceVisible} />
                        </TableCell>
                        <TableCell colSpan={isPriceVisible ? 5 : 3} className="text-center text-xs text-muted-foreground italic">
                            Search and select a material to add to BOQ
                        </TableCell>
                    </TableRow>

                </TableBody>
            </Table>
            <div className="flex items-center justify-end gap-6 p-4 border-t bg-muted/20">
                <div className="text-sm text-muted-foreground">
                    Total Items: <span className="font-medium text-foreground">{items.length}</span>
                </div>
                {isPriceVisible && (
                    <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-muted-foreground">Grand Total:</span>
                        <span className="text-2xl font-bold font-mono text-primary">
                            {formatCurrency(calculateTotal(items))}
                        </span>
                    </div>
                )}
            </div>
        </div>
    )
}
