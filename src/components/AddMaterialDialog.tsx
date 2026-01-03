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

interface AddMaterialDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onAdd: (material: Material) => void
    defaultDescription?: string
}

export function AddMaterialDialog({
    open,
    onOpenChange,
    onAdd,
    defaultDescription = "",
}: AddMaterialDialogProps) {
    const [description, setDescription] = useState("")
    const [category, setCategory] = useState("")
    const [rate, setRate] = useState("")
    const [unit, setUnit] = useState("Sheet") // Default unit

    // Details
    const [thickness, setThickness] = useState("")
    const [dimensions, setDimensions] = useState("")
    const [color, setColor] = useState("")
    const [grade, setGrade] = useState("")

    useEffect(() => {
        if (open) {
            setDescription(defaultDescription)
            // Reset other fields if needed, or keep them to allow repetitive additions
        }
    }, [open, defaultDescription])

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
            size: "", // Not exposing size/length for now as they seem redundant or specific
            length: "",
            color,
            grade,
        }

        const newMaterial: Material = {
            id: `N-${Math.floor(100 + Math.random() * 900)}`,
            category: category.toUpperCase() || "NEW",
            description,
            details,
            qty: "1", // Default qty string as in JSON
            unit,
            rate: rate ? `SAR ${parseFloat(rate).toFixed(2)}` : "SAR 0.00",
        }

        onAdd(newMaterial)
        onOpenChange(false)

        // Reset form
        setDescription("")
        setCategory("")
        setRate("")
        setThickness("")
        setDimensions("")
        setColor("")
        setGrade("")
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Add New Material</DialogTitle>
                    <DialogDescription>
                        Details for the new material. Click save when you're done.
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
