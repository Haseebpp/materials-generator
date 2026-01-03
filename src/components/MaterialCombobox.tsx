import * as React from "react"
import { ChevronsUpDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"
import type { Material } from "@/types"
import materialsData from "@/data/materials.json"
import { AddMaterialDialog } from "./AddMaterialDialog"

interface MaterialComboboxProps {
    onSelect: (material: Material) => void
    isPriceVisible?: boolean
}

export function MaterialCombobox({ onSelect, isPriceVisible = true }: MaterialComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [search, setSearch] = React.useState("")

    const filteredMaterials = React.useMemo(() => {
        if (!search) return materialsData.slice(0, 20) as Material[]
        const lowerSearch = search.toLowerCase()
        return (materialsData as Material[]).filter(
            (m) =>
                m.description.toLowerCase().includes(lowerSearch) ||
                m.category.toLowerCase().includes(lowerSearch)
        ).slice(0, 20)
    }, [search])

    const [showAddDialog, setShowAddDialog] = React.useState(false)

    return (
        <>
            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={open}
                        className="w-full justify-between font-normal text-muted-foreground hover:text-foreground"
                    >
                        {search ? search : "Search materials..."}
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[600px] p-0" align="start">
                    <Command shouldFilter={false}>
                        <CommandInput
                            placeholder="Search material description..."
                            value={search}
                            onValueChange={setSearch}
                        />
                        <CommandList>
                            <CommandEmpty className="py-2 px-2">
                                <div className="text-sm text-muted-foreground mb-2 text-center">No material found.</div>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-muted-foreground"
                                    onClick={() => {
                                        setOpen(false)
                                        setShowAddDialog(true)
                                    }}
                                >
                                    <span className="mr-2">+</span> Create new "{search}"
                                </Button>
                            </CommandEmpty>
                            <CommandGroup heading="Suggestions">
                                {filteredMaterials.map((material) => (
                                    <CommandItem
                                        key={material.id}
                                        value={material.description}
                                        onSelect={() => {
                                            onSelect(material)
                                            setOpen(false)
                                            setSearch("")
                                        }}
                                        className="flex flex-col items-start gap-1 py-3 border-b last:border-0"
                                    >
                                        <div className="flex w-full items-center justify-between">
                                            <span className="font-semibold text-sm">{material.description}</span>
                                            {isPriceVisible ? (
                                                <span className="font-mono text-xs font-bold text-primary shrink-0 ml-2">
                                                    {material.rate}
                                                </span>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-xs shrink-0 ml-2">
                                                    <span className="text-muted-foreground">{material.category}</span>
                                                    <span className="font-medium">1</span>
                                                    <span className="text-muted-foreground">{material.unit}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs text-muted-foreground w-full">
                                            <span className="bg-muted px-1.5 py-0.5 rounded text-[10px]">ID: {material.id}</span>
                                            {Object.entries(material.details).map(([key, value]) => {
                                                if (!value) return null
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
                                    </CommandItem>
                                ))}
                                {search && filteredMaterials.length > 0 && (
                                    <CommandItem
                                        value={`create-new-${search}`}
                                        onSelect={() => {
                                            setOpen(false)
                                            setShowAddDialog(true)
                                        }}
                                        className="text-blue-500 font-medium"
                                    >
                                        <span className="mr-2">+</span> Create new "{search}"
                                    </CommandItem>
                                )}
                            </CommandGroup>
                        </CommandList>
                    </Command>
                </PopoverContent>
            </Popover>

            <AddMaterialDialog
                open={showAddDialog}
                onOpenChange={setShowAddDialog}
                onAdd={onSelect}
                defaultDescription={search}
            />
        </>
    )
}
