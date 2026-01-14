import { useState } from "react"
import { Trash2, Pencil, Plus, GripVertical } from "lucide-react"
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
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from "@dnd-kit/core"
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

interface BOQTableProps {
    items: BOQItem[]
    onUpdateQuantity: (id: string, qty: number) => void
    onRemove: (id: string) => void
    onAddMaterial: (material: Material) => void
    onUpdateRemark: (id: string, remark: string) => void
    onUpdateMaterial: (material: Material) => void
    onReorder: (items: BOQItem[]) => void
    isPriceVisible: boolean
    hideRemark?: boolean // Optional: hide remark column (for AI Generator)
}

interface SortableRowProps {
    item: BOQItem
    index: number
    onEdit: (item: Material) => void
    onUpdateQuantity: (id: string, qty: number) => void
    onRemove: (id: string) => void
    onUpdateRemark: (id: string, remark: string) => void
    isPriceVisible: boolean
    hideRemark: boolean
    showDetails: boolean
    parseRate: (rateStr: string) => number
    formatCurrency: (amount: number) => string
}

function SortableRow({
    item,
    index,
    onEdit,
    onUpdateQuantity,
    onRemove,
    onUpdateRemark,
    isPriceVisible,
    hideRemark,
    showDetails,
    parseRate,
    formatCurrency,
}: SortableRowProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: item.id })

    const style = {
        transform: CSS.Transform.toString(transform),
        transition: isDragging ? 'none' : transition,
        opacity: isDragging ? 0.8 : 1,
        zIndex: isDragging ? 1000 : 'auto',
    }

    const rate = parseRate(item.rate)
    const total = rate * item.boqQty

    return (
        <TableRow
            ref={setNodeRef}
            style={style}
            onDoubleClick={(e) => {
                // Prevent edit if clicking on input fields
                if ((e.target as HTMLElement).tagName === 'INPUT') return;
                onEdit(item)
            }}
            className={`group cursor-pointer ${isDragging
                ? 'bg-primary/20 shadow-2xl'
                : 'hover:bg-muted/50 transition-colors duration-150'
                }`}
        >
            <TableCell className="font-mono text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                    <button
                        className="cursor-grab active:cursor-grabbing text-muted-foreground/50 hover:text-primary transition-colors touch-none"
                        {...attributes}
                        {...listeners}
                        title="Drag to reorder"
                    >
                        <GripVertical className="h-4 w-4" />
                    </button>
                    {index + 1}
                </div>
            </TableCell>
            <TableCell className="font-medium text-sm">
                <div className="flex flex-col gap-1.5">
                    <span>{item.description}</span>
                    {showDetails && (
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
                    )}
                </div>
            </TableCell>
            <TableCell className="text-xs text-muted-foreground">{item.category}</TableCell>
            {isPriceVisible && (
                <TableCell className="text-right font-mono text-xs">
                    {formatCurrency(rate)}
                </TableCell>
            )}
            <TableCell className="text-right">
                <Input
                    type="number"
                    min="1"
                    className="h-8 w-20 text-right touch-none ml-auto"
                    value={item.boqQty}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) =>
                        onUpdateQuantity(
                            item.id,
                            Math.max(1, parseInt(e.target.value) || 0)
                        )
                    }
                />
            </TableCell>
            <TableCell className="text-left align-middle">
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {item.unit}
                </span>
            </TableCell>
            {isPriceVisible && (
                <TableCell className="text-right font-mono text-xs font-bold">
                    {formatCurrency(total)}
                </TableCell>
            )}
            {!hideRemark && (
                <TableCell>
                    <Input
                        className="h-8 min-w-[150px]"
                        placeholder="Add remark..."
                        value={item.remarks || ""}
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => onUpdateRemark(item.id, e.target.value)}
                    />
                </TableCell>
            )}
            <TableCell className="text-right">
                <div className="flex items-center justify-end gap-1">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                            e.stopPropagation()
                            onEdit(item)
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
}

export function BOQTable({
    items,
    onUpdateQuantity,
    onRemove,
    onAddMaterial,
    onUpdateRemark,
    onUpdateMaterial,
    onReorder,
    isPriceVisible,
    hideRemark = false // Default to showing remark
}: BOQTableProps) {
    const [editingItem, setEditingItem] = useState<Material | null>(null)
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [dialogMode, setDialogMode] = useState<"add" | "edit">("add")
    const [showDetails, setShowDetails] = useState(false)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 3,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event

        if (over && active.id !== over.id) {
            const oldIndex = items.findIndex((item) => item.id === active.id)
            const newIndex = items.findIndex((item) => item.id === over.id)

            const reorderedItems = arrayMove(items, oldIndex, newIndex)
            onReorder(reorderedItems)
        }
    }

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
                        <TableHead className="w-[40%]">
                            <div className="flex items-center gap-1">
                                <span>Description • </span>
                                <button
                                    onClick={() => setShowDetails(!showDetails)}
                                    className={`text-xs transition-colors text-blue-600${showDetails
                                        ? ' dark:text-blue-400 font-medium'
                                        : ' dark:text-blue-400 hover:underline'
                                        }`}
                                >
                                    {showDetails ? 'hide details' : 'show details'}
                                </button>
                            </div>
                        </TableHead>
                        <TableHead>Category</TableHead>
                        {isPriceVisible && <TableHead className="text-right">Rate</TableHead>}
                        <TableHead className="w-[80px] text-right">Qty</TableHead>
                        <TableHead className="w-[60px] text-left">Unit</TableHead>
                        {isPriceVisible && <TableHead className="text-right">Total</TableHead>}
                        {!hideRemark && <TableHead>Remark</TableHead>}
                        <TableHead className="w-[100px] text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    <DndContext
                        sensors={sensors}
                        collisionDetection={closestCenter}
                        onDragEnd={handleDragEnd}
                    >
                        <SortableContext
                            items={items.map((item) => item.id)}
                            strategy={verticalListSortingStrategy}
                        >
                            {items.map((item, index) => (
                                <SortableRow
                                    key={item.id}
                                    item={item}
                                    index={index}
                                    onEdit={handleEdit}
                                    onUpdateQuantity={onUpdateQuantity}
                                    onRemove={onRemove}
                                    onUpdateRemark={onUpdateRemark}
                                    isPriceVisible={isPriceVisible}
                                    hideRemark={hideRemark}
                                    showDetails={showDetails}
                                    parseRate={parseRate}
                                    formatCurrency={formatCurrency}
                                />
                            ))}
                        </SortableContext>
                    </DndContext>

                    {/* Quick Add Blank Row */}
                    <TableRow
                        className="group hover:bg-muted/50 cursor-pointer border-dashed border-b-2"
                        onDoubleClick={handleQuickAdd}
                    >
                        <TableCell className="font-mono text-xs text-muted-foreground">{items.length + 1}</TableCell>
                        <TableCell colSpan={isPriceVisible ? (hideRemark ? 5 : 6) : (hideRemark ? 3 : 4)}>
                            <div className="flex items-center text-muted-foreground text-sm italic h-8">
                                <span className="opacity-50">Double-click to add new material...</span>
                            </div>
                        </TableCell>
                        {!hideRemark && <TableCell></TableCell>}
                        <TableCell className="text-right">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 text-muted-foreground hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity"
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
                        <TableCell colSpan={isPriceVisible ? (hideRemark ? 6 : 7) : (hideRemark ? 4 : 5)} className="text-left text-xs text-muted-foreground italic">
                            Search and select a material to add to BOQ
                        </TableCell>
                    </TableRow>

                </TableBody>
            </Table>
            <div className="flex items-center justify-end gap-6 p-4 border-t bg-muted/20">
                <div className="text-left text-sm text-muted-foreground">
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
