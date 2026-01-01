import { useState } from "react"
import type { Row } from "@tanstack/react-table"
import { Plus } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from "@/components/ui/dialog"
import { DataTable } from "@/components/data-table/DataTable"
import { columns } from "@/components/data-table/columns"
import type { Material } from "@/types"
import materialsData from "@/data/materials.json"

interface MaterialCatalogueProps {
    onAddMaterials: (materials: Material[]) => void
}

export function MaterialCatalogue({ onAddMaterials }: MaterialCatalogueProps) {
    const [open, setOpen] = useState(false)
    const [selectedMaterials, setSelectedMaterials] = useState<Material[]>([])

    const handleAddSelected = () => {
        onAddMaterials(selectedMaterials)
        setOpen(false)
        setSelectedMaterials([])
    }

    const renderDetailRow = (row: Row<Material>) => {
        const details = row.original.details
        return (
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border-l-4 border-yellow-400 ml-10 mb-2 rounded shadow-sm">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground mb-2">Item Details</h4>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                    {Object.entries(details).map(([key, value]) => (
                        value && (
                            <div key={key} className="flex flex-col">
                                <span className="text-[10px] text-muted-foreground capitalize">{key.replace(/_/g, " ")}</span>
                                <span className="font-medium">{value}</span>
                            </div>
                        )
                    ))}
                    <div className="flex flex-col">
                        <span className="text-[10px] text-muted-foreground">Unit</span>
                        <span className="font-medium">{row.original.unit}</span>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Browse Catalogue</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[90vw] h-[90vh] flex flex-col p-0">
                <DialogHeader className="px-6 py-4 border-b">
                    <DialogTitle>Material Catalogue</DialogTitle>
                    <DialogDescription>
                        Browse the complete material library. Expand rows to see details. Checked items can be added to BOQ in bulk.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-auto px-6 py-2">
                    <DataTable
                        columns={columns}
                        data={materialsData as Material[]}
                        renderDetailRow={renderDetailRow}
                        onSelectionChange={setSelectedMaterials}
                    >
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleAddSelected}
                                disabled={selectedMaterials.length === 0}
                                className="ml-auto"
                            >
                                <Plus className="mr-2 h-4 w-4" />
                                Add Selected ({selectedMaterials.length})
                            </Button>
                        </div>
                    </DataTable>
                </div>
            </DialogContent>
        </Dialog>
    )
}
