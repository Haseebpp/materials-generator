import { useState, useMemo } from "react"
import { Search, Plus } from "lucide-react"

import type { Material } from "@/types"
import materialsData from "@/data/materials.json"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"

interface MaterialListProps {
    onAdd: (material: Material) => void
    isPriceVisible: boolean
}

export function MaterialList({ onAdd, isPriceVisible }: MaterialListProps) {
    const [searchTerm, setSearchTerm] = useState("")

    // Group materials by category
    const groupedMaterials = useMemo(() => {
        const groups: Record<string, Material[]> = {}
        const filtered = (materialsData as Material[]).filter(
            (m) =>
                m.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                m.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                Object.values(m.details).some(val => val.toLowerCase().includes(searchTerm.toLowerCase()))
        )

        filtered.forEach((item) => {
            const category = item.category || "Uncategorized"
            if (!groups[category]) {
                groups[category] = []
            }
            groups[category].push(item)
        })

        return groups
    }, [searchTerm])

    // Create a default checked value if search is active so relevant lists open
    const defaultValue = useMemo(() => {
        if (!searchTerm) return []
        return Object.keys(groupedMaterials).slice(0, 10) // Limit expand to avoid lag if matches many
    }, [groupedMaterials, searchTerm])

    return (
        <div className="flex flex-col h-full bg-card">
            <div className="p-4 border-b space-y-4">
                <h2 className="font-semibold text-lg tracking-tight">Material Library</h2>
                <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search materials..."
                        className="pl-8"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
            <ScrollArea className="flex-1" fadeColor="from-card">
                <div className="p-4">
                    {Object.keys(groupedMaterials).length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground py-8">
                            No materials found.
                        </div>
                    ) : (
                        <Accordion type="multiple" className="w-full" value={defaultValue.length > 0 ? defaultValue : undefined}>
                            {Object.entries(groupedMaterials).map(([category, items]) => (
                                <AccordionItem key={category} value={category} className="border-b-0 mb-2 bg-card">
                                    <AccordionTrigger className="px-3 py-2 hover:bg-muted/50 rounded-md text-sm font-semibold uppercase text-muted-foreground hover:no-underline hover:text-foreground group data-[state=open]:text-foreground data-[state=open]:bg-muted/50">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="truncate" title={category}>{category}</span>
                                            <span className="bg-muted-foreground/10 text-muted-foreground text-[10px] px-1.5 py-0.5 rounded-full group-hover:bg-background group-hover:text-foreground transition-colors shrink-0">
                                                {items.length}
                                            </span>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="pt-1 pb-2">
                                        <div className="space-y-1 pl-1">
                                            {items.map((material) => (
                                                <div
                                                    key={material.id}
                                                    className="group flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors border border-transparent hover:border-border/50 animate-in fade-in slide-in-from-top-1 duration-200 cursor-pointer select-none"
                                                    onDoubleClick={() => onAdd(material)}
                                                >
                                                    <div className="flex flex-col min-w-0 pr-2">
                                                        <span className="text-sm font-medium truncate" title={material.description}>
                                                            <span className="font-mono text-muted-foreground mr-2">{material.id}.</span>
                                                            {material.description}
                                                        </span>
                                                        <div className="text-[10px] font-medium text-muted-foreground mt-0.5">
                                                            {Object.entries(material.details)
                                                                .filter(([_, value]) => value) // Only showing non-empty values
                                                                .map(([key, value]) => {
                                                                    const label = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
                                                                    return `${label}: ${value}`
                                                                })
                                                                .join(" • ")}
                                                            {isPriceVisible && (
                                                                <>
                                                                    <span className="mx-1">•</span>
                                                                    <span className="text-[10px] font-medium text-green-600 dark:text-green-400">
                                                                        {material.rate}
                                                                    </span>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                    <Button
                                                        size="icon"
                                                        variant="secondary"
                                                        className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 shadow-sm"
                                                        onClick={() => onAdd(material)}
                                                    >
                                                        <Plus className="h-3.5 w-3.5" />
                                                    </Button>
                                                </div>
                                            ))}
                                        </div>
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    )}
                </div>
            </ScrollArea>
        </div>
    )
}
