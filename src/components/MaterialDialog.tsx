import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CreatableCombobox } from "@/components/ui/creatable-combobox"
import type { Material, MaterialDetails } from "@/types"
import materialsData from "@/data/materials.json"

interface MaterialDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSave: (material: Material) => void
    initialData?: Material | null
    defaultDescription?: string
    mode?: "add" | "edit"
}

export function MaterialDialog({
    open,
    onOpenChange,
    onSave,
    initialData,
    defaultDescription = "",
    mode = "add",
}: MaterialDialogProps) {
    const [description, setDescription] = useState("")
    const [category, setCategory] = useState("")
    const [rate, setRate] = useState("")
    const [unit, setUnit] = useState("Sheet") // Default unit

    // Details
    const [thickness, setThickness] = useState("")
    const [dimensions, setDimensions] = useState("")
    const [size, setSize] = useState("")
    const [length, setLength] = useState("")
    const [color, setColor] = useState("")
    const [grade, setGrade] = useState("")

    useEffect(() => {
        if (open) {
            if (mode === "edit" && initialData) {
                setDescription(initialData.description)
                setCategory(initialData.category)
                setUnit(initialData.unit)

                // Parse rate: Remove "SAR " and any other non-numeric chars except dot
                const numericRate = initialData.rate.replace(/[^0-9.]/g, "")
                setRate(numericRate)

                // Set details
                setThickness(initialData.details.thickness || "")
                setDimensions(initialData.details.dimensions || "")
                setSize(initialData.details.size || "")
                setLength(initialData.details.length || "")
                setColor(initialData.details.color || "")
                setGrade(initialData.details.grade || "")
            } else {
                // Reset for add mode
                setDescription(defaultDescription)
                setCategory("")
                setRate("")
                setUnit("Sheet")
                setThickness("")
                setDimensions("")
                setSize("")
                setLength("")
                setColor("")
                setGrade("")
            }
        }
    }, [open, mode, initialData, defaultDescription])

    const { categories, units } = useMemo(() => {
        const uniqueCategories = Array.from(new Set((materialsData as Material[]).map(m => m.category))).sort()
        const uniqueUnits = Array.from(new Set((materialsData as Material[]).map(m => m.unit))).sort()
        return { categories: uniqueCategories, units: uniqueUnits }
    }, [])

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()

        const details: MaterialDetails = {
            thickness,
            dimensions,
            size,
            length,
            color,
            grade,
        }

        const materialToSave: Material = {
            id: mode === "edit" && initialData ? initialData.id : `N-${Math.floor(100 + Math.random() * 900)}`,
            category: category.toUpperCase() || "NEW",
            description,
            details,
            qty: "1",
            unit,
            rate: rate ? `SAR ${parseFloat(rate).toFixed(2)}` : "SAR 0.00",
        }

        onSave(materialToSave)
        onOpenChange(false)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{mode === "edit" ? "Edit Material" : "Add New Material"}</DialogTitle>
                    <DialogDescription>
                        {mode === "edit"
                            ? "Update the details for this material."
                            : "Details for the new material."} Click save when you're done.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="grid gap-4 py-4">
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="description" className="text-right">
                            Description
                        </Label>
                        <Input
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="col-span-3"
                            required
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="category" className="text-right">
                            Category
                        </Label>
                        <div className="col-span-3">
                            <CreatableCombobox
                                options={categories}
                                value={category}
                                onChange={setCategory}
                                placeholder="Select or type category..."
                                emptyText="No category found."
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="rate" className="text-right">
                            Rate (SAR)
                        </Label>
                        <Input
                            id="rate"
                            type="number"
                            min="0"
                            step="0.01"
                            value={rate}
                            onChange={(e) => setRate(e.target.value)}
                            className="col-span-3"
                            placeholder="0.00"
                        />
                    </div>
                    <div className="grid grid-cols-4 items-center gap-4">
                        <Label htmlFor="unit" className="text-right">
                            Unit
                        </Label>
                        <div className="col-span-3">
                            <CreatableCombobox
                                options={units}
                                value={unit}
                                onChange={setUnit}
                                placeholder="Select or type unit..."
                                emptyText="No unit found."
                            />
                        </div>
                    </div>

                    <div className="border-t pt-4 mt-2">
                        <div className="text-sm font-medium mb-3">Optional Details</div>
                        <div className="space-y-3">
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="thickness" className="text-right text-xs">
                                    Thickness
                                </Label>
                                <Input
                                    id="thickness"
                                    value={thickness}
                                    onChange={(e) => setThickness(e.target.value)}
                                    className="col-span-3 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="dimensions" className="text-right text-xs">
                                    Dimensions
                                </Label>
                                <Input
                                    id="dimensions"
                                    value={dimensions}
                                    onChange={(e) => setDimensions(e.target.value)}
                                    className="col-span-3 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="color" className="text-right text-xs">
                                    Color
                                </Label>
                                <Input
                                    id="color"
                                    value={color}
                                    onChange={(e) => setColor(e.target.value)}
                                    className="col-span-3 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="grade" className="text-right text-xs">
                                    Grade
                                </Label>
                                <Input
                                    id="grade"
                                    value={grade}
                                    onChange={(e) => setGrade(e.target.value)}
                                    className="col-span-3 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="size" className="text-right text-xs">
                                    Size
                                </Label>
                                <Input
                                    id="size"
                                    value={size}
                                    onChange={(e) => setSize(e.target.value)}
                                    className="col-span-3 h-8"
                                />
                            </div>
                            <div className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor="length" className="text-right text-xs">
                                    Length
                                </Label>
                                <Input
                                    id="length"
                                    value={length}
                                    onChange={(e) => setLength(e.target.value)}
                                    className="col-span-3 h-8"
                                />
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="submit">Save changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
