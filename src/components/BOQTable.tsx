import { useState } from "react"
import { Trash2, Pencil, Plus } from "lucide-react"
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
import { MaterialDialog } from "./MaterialDialog"

interface BOQTableProps {
    items: BOQItem[]
    onUpdateQuantity: (id: string, qty: number) => void
    onRemove: (id: string) => void
    onAddMaterial: (material: Material) => void
    onUpdateRemark: (id: string, remark: string) => void
    onUpdateMaterial: (material: Material) => void
    isPriceVisible: boolean
}

export function BOQTable({
    items,
    onUpdateQuantity,
    onRemove,
    onAddMaterial,
    onUpdateRemark,
    onUpdateMaterial, // New prop
    isPriceVisible
}: BOQTableProps) {
    const [editingItem, setEditingItem] = useState<Material | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"add" | "edit">("add")

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

    const handleEdit = (item: Material) => {
        setEditingItem(item)
        setDialogMode("edit")
        setIsDialogOpen(true)
    }

    const handleQuickAdd = () => {
        setEditingItem(null)
        setDialogMode("add")
        setIsDialogOpen(true)
    }

    const handleSaveDialog = (material: Material) => {
        if (dialogMode === "edit") {
            onUpdateMaterial(material)
        } else {
            onAddMaterial(material)
        }
    }

    return (
        <div className="rounded-md border bg-card shadow-sm">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]">No.</TableHead>
                        <TableHead className="w-[40%]">Description</TableHead>
                        <TableHead>Category</TableHead>
                        {isPriceVisible && <TableHead className="text-right">Rate</TableHead>}
                        <TableHead className="w-[100px] text-right">Qty</TableHead>
                        {isPriceVisible && <TableHead className="text-right">Total</TableHead>}
                        <TableHead>Remark</TableHead>
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {items.map((item) => {
                        const rate = parseRate(item.rate)
                        const total = rate * item.boqQty

                        return (
                            <TableRow
                                key={item.id}
                                onDoubleClick={(e) => {
                                    // Prevent edit if clicking on input fields
                                    if ((e.target as HTMLElement).tagName === 'INPUT') return;
                                    handleEdit(item)
                                }}
                                className="group cursor-pointer hover:bg-muted/50 transition-colors"
                            >
                                <TableCell className="font-mono text-xs text-muted-foreground">{items.indexOf(item) + 1}</TableCell>
                                <TableCell className="font-medium text-sm">
                                    <div className="flex flex-col gap-1.5">
                                        <span>{item.description}</span>
                                        <div className="flex flex-wrap gap-2">
                                            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px] text-muted-foreground font-mono">
                                                ID: {item.id}
                                            </span>
                                            {Object.entries(item.details)
                                                .filter(([_, value]) => value)
                                                .map(([key, value]) => {
                                                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                                                    return (
                                                        <span
                                                            key={key}
                                                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-100 dark:border-blue-800"
                                                        >
                                                            {label}: {value}
                                                        </span>
                                                    )
                                                })}
                                        </div>
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
                                            className="h-8 w-20 text-right touch-none"
                                            value={item.boqQty}
                                            onClick={(e) => e.stopPropagation()}
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
                                    <Input
                                        className="h-8 min-w-[150px]"
                                        placeholder="Add remark..."
                                        value={item.remarks || ""}
                                        onClick={(e) => e.stopPropagation()}
                                        onChange={(e) => onUpdateRemark(item.id, e.target.value)}
                                    />
                                </TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end gap-1">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleEdit(item)
                                            }}
                                            title="Edit Material"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                onRemove(item.id)
                                            }}
                                            title="Remove Item"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )
                    })}

                    {/* Quick Add Blank Row */}
                    <TableRow
                        className="hover:bg-muted/50 cursor-pointer border-dashed border-b-2"
                        onDoubleClick={handleQuickAdd}
                    >
                        <TableCell className="font-mono text-xs text-muted-foreground">{items.length + 1}</TableCell>
                        <TableCell colSpan={isPriceVisible ? 5 : 3}>
                            <div className="flex items-center text-muted-foreground text-sm italic h-8">
                                <span className="opacity-50">Double-click to add new material...</span>
                            </div>
                        </TableCell>
                        <TableCell>
                        </TableCell>
                        <TableCell className="text-right">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                onClick={(e) => {
                                    e.stopPropagation()
                                    handleQuickAdd()
                                }}
                                title="Add New Material"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </TableCell>
                    </TableRow>

                    <TableRow className="bg-muted/30 hover:bg-muted/50">
                        <TableCell colSpan={2} className="p-2">
                            <MaterialCombobox onSelect={onAddMaterial} isPriceVisible={isPriceVisible} />
                        </TableCell>
                        <TableCell colSpan={isPriceVisible ? 6 : 4} className="text-center text-xs text-muted-foreground italic">
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

            <MaterialDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                onSave={handleSaveDialog}
                initialData={editingItem}
                mode={dialogMode}
            />
        </div>
    )
}
