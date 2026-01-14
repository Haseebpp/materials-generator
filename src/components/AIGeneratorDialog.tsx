import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sparkles, Upload, Loader2, Settings, Copy, Check, ArrowLeftRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BOQTable } from "@/components/BOQTable";
import { generateMaterialList } from "@/lib/aiService";
import type { BOQItem, Material } from "@/types";

interface AIGeneratorDialogProps {
    onAddMaterials: (items: BOQItem[]) => void;
}

type Step = "input" | "processing" | "review";

export function AIGeneratorDialog({ onAddMaterials }: AIGeneratorDialogProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<Step>("input");
    const [description, setDescription] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [apiKey, setApiKey] = useState(() => localStorage.getItem("openai_api_key") || "");
    const [generatedItems, setGeneratedItems] = useState<BOQItem[]>([]);
    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // Resize Logic (percentage-based)
    const [sidebarWidth, setSidebarWidth] = useState(50); // percentage
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Counter for simple ID generation
    const generatedCounterRef = useRef(1);

    const startResizing = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setIsResizing(true);
    }, []);

    const stopResizing = useCallback(() => {
        setIsResizing(false);
    }, []);

    const resize = useCallback((mouseMoveEvent: MouseEvent) => {
        if (isResizing && containerRef.current) {
            const containerRect = containerRef.current.getBoundingClientRect();
            const newWidth = ((mouseMoveEvent.clientX - containerRect.left) / containerRect.width) * 100;
            // Limit range to avoid breaking UI (20% to 80%)
            if (newWidth > 20 && newWidth < 80) {
                setSidebarWidth(newWidth);
            }
        }
    }, [isResizing]);

    useEffect(() => {
        if (isResizing) {
            window.addEventListener("mousemove", resize);
            window.addEventListener("mouseup", stopResizing);
        }
        return () => {
            window.removeEventListener("mousemove", resize);
            window.removeEventListener("mouseup", stopResizing);
        };
    }, [isResizing, resize, stopResizing]);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files)]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(prev => [...prev, ...Array.from(e.target.files!)]);
        }
    };

    const handleApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const key = e.target.value;
        setApiKey(key);
        localStorage.setItem("openai_api_key", key);
    };

    const handleGenerate = async () => {
        if (!description && files.length === 0) return;

        setStep("processing");

        try {
            const result = await generateMaterialList(description, files, apiKey);

            // Parse description to extract Category if present (Category: Description)
            const parsedItems = result.items.map(item => {
                let cat = "Generated";
                let desc = item.description || "";

                if (desc.includes(":")) {
                    const parts = desc.split(":");
                    cat = parts[0].trim();
                    desc = parts.slice(1).join(":").trim();
                }

                return {
                    ...item,
                    category: cat,
                    description: desc
                };
            });

            // Convert to full BOQItem objects with simple IDs
            const validItems = parsedItems.map((item) => ({
                id: `G-${String(generatedCounterRef.current++).padStart(3, '0')}`,
                category: item.category || "Generated",
                description: item.description || "Unknown Material",
                qty: String(item.qty || 0),
                unit: item.unit || "PCS",
                rate: "0",
                details: {},
                boqQty: Number(item.qty) || 1,
                remarks: ""
            })) as BOQItem[];

            setGeneratedItems(validItems);
            setStep("review");
        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            alert(`Failed to generate materials: ${errorMessage}`);
            setStep("input");
        }
    };

    const handleUpdateQuantity = (id: string, qty: number) => {
        setGeneratedItems(prev =>
            prev.map(item => item.id === id ? { ...item, boqQty: qty } : item)
        );
    };

    const handleRemove = (id: string) => {
        setGeneratedItems(prev => prev.filter(item => item.id !== id));
    };

    const handleUpdateMaterial = (material: Material) => {
        setGeneratedItems(prev =>
            prev.map(item => item.id === material.id ? { ...item, ...material } : item)
        );
    };

    const handleAddMaterial = (material: Material) => {
        const newItem: BOQItem = {
            ...material,
            id: `G-${String(generatedCounterRef.current++).padStart(3, '0')}`,
            boqQty: 1,
            remarks: ""
        };
        setGeneratedItems(prev => [...prev, newItem]);
    };

    // Dummy handler for remark (not used but required by BOQTable)
    const handleUpdateRemark = (id: string, remark: string) => {
        // No-op: remarks are not editable in AI generator
    };

    const handleCopyToClipboard = () => {
        const header = "S:NO\tDESCRIPTION\tCATEGORY\tQTY UNITS";
        const rows = generatedItems.map((item, idx) => {
            return `${idx + 1}\t${item.description || ""}\t${item.category || ""}\t${item.boqQty || 0} ${item.unit || ""}`;
        }).join("\n");

        navigator.clipboard.writeText(`${header}\n${rows}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAddToBOQ = () => {
        onAddMaterials(generatedItems);
        setOpen(false);
        setStep("input");
        setFiles([]);
        setDescription("");
        setGeneratedItems([]);
        generatedCounterRef.current = 1; // Reset counter
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border-indigo-200 text-indigo-700 hover:text-indigo-800">
                    <Sparkles className="h-4 w-4" />
                    Generate with AI
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 gap-0">
                <DialogHeader className="px-6 py-4 border-b flex-shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <Sparkles className="h-5 w-5 text-indigo-500" />
                        AI Material Generator
                    </DialogTitle>
                </DialogHeader>

                <div className={`flex-1 flex overflow-hidden w-full ${isResizing ? 'select-none' : ''}`} ref={containerRef}>
                    {/* Left Sidebar - Input */}
                    <aside
                        className="flex-shrink-0 flex flex-col h-full bg-card"
                        style={{ width: `${sidebarWidth}%` }}
                    >
                        <div className="p-4 border-b space-y-4">
                            <h2 className="font-semibold text-lg tracking-tight">Input</h2>
                        </div>

                        <ScrollArea className="flex-1" fadeColor="from-card">
                            <div className="p-6 space-y-6">
                                <div className="space-y-2">
                                    <Label className="text-base font-semibold">Description / Prompt</Label>
                                    <Textarea
                                        placeholder="Describe the unit or paste project requirements here... (e.g., 'Reception Desk with Corian top and MDF structure')"
                                        value={description}
                                        onChange={(e) => setDescription(e.target.value)}
                                        className="h-48 resize-none bg-background focus:ring-indigo-500/20"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-base font-semibold">Reference Images</Label>
                                    <div
                                        className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-muted-foreground/25 hover:bg-background hover:border-indigo-300"}`}
                                        onDragOver={handleDragOver}
                                        onDragLeave={handleDragLeave}
                                        onDrop={handleDrop}
                                        onClick={() => fileInputRef.current?.click()}
                                    >
                                        {files.length === 0 ? (
                                            <div className="flex flex-col items-center justify-center py-2">
                                                <div className={`p-3 rounded-full bg-muted mb-3 ${isDragging ? "animate-bounce" : ""}`}>
                                                    <Upload className="h-6 w-6 text-muted-foreground" />
                                                </div>
                                                <p className="text-sm font-medium">
                                                    {isDragging ? "Drop images here" : "Click or Drag images"}
                                                </p>
                                            </div>
                                        ) : (
                                            <div className="grid grid-cols-2 gap-2">
                                                {files.map((f, i) => (
                                                    <div key={i} className="group relative aspect-square rounded-md overflow-hidden border bg-background shadow-sm">
                                                        <img
                                                            src={URL.createObjectURL(f)}
                                                            alt="preview"
                                                            className="h-full w-full object-cover"
                                                        />
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setFiles(files.filter((_, idx) => idx !== i));
                                                            }}
                                                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <span className="sr-only">Remove</span>
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
                                                        </button>
                                                    </div>
                                                ))}
                                                <div className="aspect-square rounded-md border-2 border-dashed flex flex-col items-center justify-center text-muted-foreground hover:bg-accent/50 transition-colors">
                                                    <Upload className="h-4 w-4" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="file"
                                        ref={fileInputRef}
                                        className="hidden"
                                        multiple
                                        accept="image/*"
                                        onChange={handleFileChange}
                                    />
                                </div>

                                <div className="pt-2">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="sm" className="text-muted-foreground gap-2 w-full justify-start h-auto py-2 font-normal">
                                                <Settings className="h-4 w-4" />
                                                Advanced Settings
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80">
                                            <div className="space-y-2">
                                                <h4 className="font-medium leading-none">API Configuration</h4>
                                                <p className="text-sm text-muted-foreground">
                                                    Enter your own Google Gemini API Key override.
                                                </p>
                                                <Input
                                                    type="password"
                                                    placeholder="Default Key Active"
                                                    value={apiKey}
                                                    onChange={handleApiKeyChange}
                                                    className="h-8"
                                                />
                                            </div>
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>
                        </ScrollArea>

                        <div className="p-6 border-t bg-background">
                            <Button
                                onClick={handleGenerate}
                                disabled={(!description && files.length === 0) || step === "processing"}
                                className="w-full h-12 text-base shadow-md bg-indigo-600 hover:bg-indigo-700 transition-all"
                            >
                                {step === "processing" ? (
                                    <>
                                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                        Generating...
                                    </>
                                ) : generatedItems.length > 0 ? (
                                    <>
                                        <Sparkles className="mr-2 h-5 w-5" />
                                        Regenerate List
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="mr-2 h-5 w-5" />
                                        Generate List
                                    </>
                                )}
                            </Button>
                            {/* <Button
                                variant="outline"
                                onClick={() => {
                                    const mockData = [
                                        { description: "MDF PLAIN 18MM (1.22X2.44M)", category: "Wood", qty: "3", unit: "SHEET" },
                                        { description: "MDF PLAIN 12MM (1.22X2.44M)", category: "Wood", qty: "1", unit: "SHEET" },
                                        { description: "ACRYLIC CLEAR 5MM (1.22X2.44M)", category: "Plastic", qty: "1.5", unit: "SHEET" },
                                        { description: "ACRYLIC FLUTED CLEAR (1.22X2.44M)", category: "Plastic", qty: "0.5", unit: "SHEET" },
                                        { description: "MS SHEET 2MM (1.22X2.44M)", category: "Metal", qty: "0.5", unit: "SHEET" },
                                        { description: "GRAPHICS VINYL STICKER", category: "Graphics", qty: "5", unit: "SQM" },
                                        { description: "BUSH", category: "Hardware", qty: "4", unit: "PCS" },
                                        { description: "FEVICOL", category: "Consumable", qty: "2", unit: "KG" },
                                        { description: "CHLOROFORM", category: "Consumable", qty: "1", unit: "0.5" },
                                        { description: "SUPER GLUE", category: "Consumable", qty: "5", unit: "NOS" },
                                        { description: "SCREWS", category: "Hardware", qty: "100", unit: "PCS" },
                                        { description: "GUN NAILS", category: "Hardware", qty: "1", unit: "PKT" },
                                        { description: "SANDING PAPER", category: "Consumable", qty: "8", unit: "PCS" },
                                        { description: "PU PAINT", category: "Paint", qty: "1", unit: "LTR" },
                                        { description: "PU HARDENER", category: "Paint", qty: "0.5", unit: "LTR" },
                                        { description: "PU THINNER", category: "Paint", qty: "0.25", unit: "LTR" },
                                        { description: "PU PRIMER", category: "Paint", qty: "2", unit: "LTR" },
                                        { description: "PU PRIMER HARDENER", category: "Paint", qty: "1", unit: "LTR" },
                                        { description: "PU PRIMER THINNER", category: "Paint", qty: "3", unit: "LTR" },
                                        { description: "PUTTY", category: "Paint", qty: "0.1", unit: "KG" },
                                    ].map((item, idx) => ({
                                        id: `G-${String(generatedCounterRef.current++).padStart(3, '0')}`,
                                        category: item.category,
                                        description: item.description,
                                        qty: item.qty,
                                        unit: item.unit,
                                        rate: "0",
                                        details: {},
                                        boqQty: Number(item.qty) || 1,
                                        remarks: ""
                                    })) as BOQItem[];

                                    setGeneratedItems(mockData);
                                    setStep("review");
                                    setDescription("Test Generation");
                                }}
                                className="w-full mt-2"
                            >
                                Test Fill (Dev)
                            </Button> */}
                        </div>
                    </aside>

                    {/* Resizable Handle */}
                    <div
                        className="w-4 bg-transparent hover:bg-primary/10 cursor-col-resize flex items-center justify-center relative group transition-colors -ml-0 z-10"
                        onMouseDown={startResizing}
                    >
                        {/* Visible line */}
                        <div className="absolute inset-y-0 w-px bg-border group-hover:bg-primary/50 transition-colors left-1/2 -translate-x-1/2" />

                        {/* Round handle with arrow */}
                        <div className="bg-background border shadow-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity absolute pointer-events-none transform -translate-x-1 shadow-md">
                            <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                        </div>
                    </div>

                    {/* Right Content - Results */}
                    <main
                        className="flex-shrink-0 flex flex-col overflow-hidden relative bg-background"
                        style={{ width: `${100 - sidebarWidth}%` }}
                    >
                        {step === "processing" ? (
                            <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                                <div className="p-4 rounded-full bg-indigo-50 animate-pulse">
                                    <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="font-semibold text-xl text-indigo-900">Analyzing Requirements...</h3>
                                    <p className="text-muted-foreground">Identifying materials, finishes, and quantities from your prompt.</p>
                                </div>
                            </div>
                        ) : null}

                        {generatedItems.length > 0 ? (
                            <div className="flex-1 flex flex-col overflow-hidden">
                                {/* Action Bar */}
                                <div className="flex items-center justify-between px-6 py-3 border-b bg-white">
                                    <h3 className="font-semibold text-base">Generated Materials</h3>
                                    <div className="flex items-center gap-2">
                                        <Button variant="outline" size="sm" onClick={handleCopyToClipboard} className="h-9">
                                            {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                                            Copy
                                        </Button>
                                        <Button size="sm" onClick={handleAddToBOQ} className="h-9 bg-green-600 hover:bg-green-700">
                                            <Check className="h-4 w-4 mr-2" />
                                            Add to Project
                                        </Button>
                                    </div>
                                </div>

                                {/* BOQTable - with ScrollArea */}
                                <ScrollArea className="flex-1">
                                    <div className="p-6">
                                        <BOQTable
                                            items={generatedItems}
                                            onUpdateQuantity={handleUpdateQuantity}
                                            onRemove={handleRemove}
                                            onAddMaterial={handleAddMaterial}
                                            onUpdateRemark={handleUpdateRemark}
                                            onUpdateMaterial={handleUpdateMaterial}
                                            isPriceVisible={false}
                                            hideRemark={true}
                                        />
                                    </div>
                                </ScrollArea>
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center text-slate-300 p-8">
                                <div className="h-24 w-24 rounded-full bg-slate-100 flex items-center justify-center mb-6">
                                    <Sparkles className="h-10 w-10 text-slate-300" />
                                </div>
                                <h3 className="text-xl font-semibold text-slate-400">Ready to Generate</h3>
                                <p className="max-w-xs text-center text-slate-400 mt-2">
                                    Describe your items or upload sketches on the left, then click Generate.
                                </p>
                            </div>
                        )}
                    </main>
                </div>
            </DialogContent>
        </Dialog>
    );
}
