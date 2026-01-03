import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
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

interface CreatableComboboxProps {
    options: string[]
    value?: string
    onChange: (value: string) => void
    placeholder?: string
    emptyText?: string
    className?: string
}

export function CreatableCombobox({
    options,
    value,
    onChange,
    placeholder = "Select...",
    emptyText = "No option found.",
    className,
}: CreatableComboboxProps) {
    const [open, setOpen] = React.useState(false)
    const [searchTerm, setSearchTerm] = React.useState("")

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className={cn("w-full justify-between font-normal", className)}
                >
                    {value ? value : <span className="text-muted-foreground">{placeholder}</span>}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={placeholder} onValueChange={setSearchTerm} />
                    <CommandList>
                        <CommandEmpty className="py-2 px-2">
                            <div className="text-sm text-muted-foreground mb-2 text-center">{emptyText}</div>
                            {searchTerm && (
                                <Button
                                    variant="ghost"
                                    className="w-full justify-start text-sm"
                                    onClick={() => {
                                        onChange(searchTerm)
                                        setOpen(false)
                                    }}
                                >
                                    Create "{searchTerm}"
                                </Button>
                            )}
                        </CommandEmpty>
                        <CommandGroup>
                            {options.map((option) => (
                                <CommandItem
                                    key={option}
                                    value={option}
                                    onSelect={(_) => {
                                        onChange(option) // Use the original option string to preserve case if needed
                                        setOpen(false)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === option ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option}
                                </CommandItem>
                            ))}
                            {searchTerm && !options.some(o => o.toLowerCase() === searchTerm.toLowerCase()) && (
                                <CommandItem
                                    value={`CREATE:${searchTerm}`}
                                    onSelect={() => {
                                        onChange(searchTerm)
                                        setOpen(false)
                                    }}
                                    className="text-blue-500"
                                >
                                    <span className="mr-2">+</span> Create "{searchTerm}"
                                </CommandItem>
                            )}
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
