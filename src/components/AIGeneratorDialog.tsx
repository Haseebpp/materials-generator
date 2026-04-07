import { useState, useRef, useCallback, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Upload, Loader2, Settings, Copy, Check, ArrowLeftRight, History, Download, Trash2, RotateCcw, ChevronRight, ChevronLeft } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BOQTable } from "@/components/BOQTable";
import { generateProfessionalMaterials, generateStandardizedMaterials } from "@/lib/aiService";
import * as historyService from "@/lib/historyService";
import type { BOQItem, Material } from "@/types";
import type { GenerationHistorySummary } from "@/types/historyTypes";

interface AIGeneratorDialogProps {
    onAddMaterials: (items: BOQItem[]) => void;
}

type Step = "input" | "processing" | "review";

// Configuration for table tabs - extensible for future prompt tables
interface TableTabConfig {
    id: string;
    label: string;
    description: string;
}

const TABLE_TABS: TableTabConfig[] = [
    { id: "professional", label: "Professional", description: "AI-generated professional materials list" },
    { id: "standardized", label: "D&C Standardized", description: "Matched to D&C company standards" }
];

export function AIGeneratorDialog({ onAddMaterials }: AIGeneratorDialogProps) {
    const [open, setOpen] = useState(false);
    const [step, setStep] = useState<Step>("input");
    const [description, setDescription] = useState("");
    const [files, setFiles] = useState<File[]>([]);
    const [apiKey, setApiKey] = useState(() => localStorage.getItem("openai_api_key") || "");

    // Separate state for each table tab
    const [professionalItems, setProfessionalItems] = useState<BOQItem[]>([]);
    const [standardizedItems, setStandardizedItems] = useState<BOQItem[]>([]);
    const [isStandardizing, setIsStandardizing] = useState(false);
    const [standardizedGenerated, setStandardizedGenerated] = useState(false);
    const [activeTab, setActiveTab] = useState<string>("professional");

    const [copied, setCopied] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isDragging, setIsDragging] = useState(false);

    // History panel state
    const [showHistory, setShowHistory] = useState(false);
    const [historySummaries, setHistorySummaries] = useState<GenerationHistorySummary[]>([]);
    const [currentHistoryId, setCurrentHistoryId] = useState<string | null>(null);

    // Resize Logic (percentage-based)
    const [sidebarWidth, setSidebarWidth] = useState(50); // percentage
    const [isResizing, setIsResizing] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Counters for simple ID generation
    const professionalCounterRef = useRef(1);
    const standardizedCounterRef = useRef(1);

    // Load history on mount and when dialog opens
    useEffect(() => {
        if (open) {
            refreshHistory();
        }
    }, [open]);

    const refreshHistory = () => {
        setHistorySummaries(historyService.getHistorySummaries());
    };

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

    // Helper function to parse description and extract category
    const parseItem = (item: Partial<BOQItem>) => {
        let cat = "Generated";
        let desc = item.description || "";

        if (desc.includes(":")) {
            const parts = desc.split(":");
            cat = parts[0].trim();
            desc = parts.slice(1).join(":").trim();
        }

        return { category: cat, description: desc };
    };

    const handleGenerate = async () => {
        if (!description && files.length === 0) return;

        setStep("processing");
        setCurrentHistoryId(null); // This is a new generation
        setStandardizedGenerated(false); // Reset standardized state
        setStandardizedItems([]); // Clear previous standardized items

        try {
            // Step 1: Generate Professional Materials Only
            const result = await generateProfessionalMaterials(description, files, apiKey);

            // Process Professional Items
            const parsedProfessionalItems = result.professionalItems.map(item => {
                const parsed = parseItem(item);
                return { ...item, ...parsed };
            });

            const validProfessionalItems = parsedProfessionalItems.map((item) => ({
                id: `P-${String(professionalCounterRef.current++).padStart(3, '0')}`,
                category: item.category || "Generated",
                description: item.description || "Unknown Material",
                qty: String(item.qty || 0),
                unit: item.unit || "PCS",
                rate: "0",
                details: {},
                boqQty: Number(item.qty) || 1,
                remarks: ""
            })) as BOQItem[];

            setProfessionalItems(validProfessionalItems);
            setActiveTab("professional"); // Default to Professional tab after generation
            setStep("review");

            // Save to history (without standardized items initially)
            const savedEntry = await historyService.saveGeneration(
                description,
                files,
                validProfessionalItems,
                [], // Empty standardized items - will be added later
                !!apiKey
            );
            setCurrentHistoryId(savedEntry.id);
            refreshHistory();

            // Step 2: Automatically start D&C standardization in background
            startBackgroundStandardization(validProfessionalItems, savedEntry.id);

        } catch (error) {
            console.error(error);
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            alert(`Failed to generate materials: ${errorMessage}`);
            setStep("input");
        }
    };

    // Background D&C standardization - runs automatically after professional generation
    const startBackgroundStandardization = async (profItems: BOQItem[], historyId: string) => {
        if (profItems.length === 0) return;

        setIsStandardizing(true);

        try {
            // Prepare items for standardization (use the raw format expected by AI)
            const itemsForStandardization = profItems.map(item => ({
                description: `${item.category}: ${item.description}`,
                qty: item.qty,
                unit: item.unit
            }));

            const result = await generateStandardizedMaterials(itemsForStandardization, apiKey);

            // Process Standardized Items
            const validStandardizedItems = result.standardizedItems.map((item) => ({
                id: `S-${String(standardizedCounterRef.current++).padStart(3, '0')}`,
                category: item.category || "D&C",
                description: item.description || "Unknown Material",
                qty: String(item.qty || 0),
                unit: item.unit || "PCS",
                rate: "0",
                details: {},
                boqQty: Number(item.qty) || 1,
                remarks: ""
            })) as BOQItem[];

            setStandardizedItems(validStandardizedItems);
            setStandardizedGenerated(true);

            // Update history with standardized items
            const existingEntry = historyService.getEntry(historyId);
            if (existingEntry) {
                await historyService.saveGeneration(
                    existingEntry.prompt,
                    historyService.dataUrlsToFiles(existingEntry.imageDataUrls),
                    profItems,
                    validStandardizedItems,
                    !!apiKey
                );
                refreshHistory();
            }

        } catch (error) {
            console.error(error);
            // Don't show alert for background errors - just log
            console.error('Background D&C standardization failed:', error);
        } finally {
            setIsStandardizing(false);
        }
    };

    // History actions
    const handleRestoreFromHistory = (id: string) => {
        const entry = historyService.getEntry(id);
        if (!entry) return;

        // Restore prompt and files
        setDescription(entry.prompt);
        setFiles(historyService.dataUrlsToFiles(entry.imageDataUrls));

        // Restore generated items
        setProfessionalItems(entry.professionalItems);
        setStandardizedItems(entry.standardizedItems);
        setStandardizedGenerated(entry.standardizedItems.length > 0);

        // Update counters to avoid ID conflicts
        const maxProfId = Math.max(0, ...entry.professionalItems.map(i => {
            const match = i.id.match(/P-(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }));
        const maxStdId = Math.max(0, ...entry.standardizedItems.map(i => {
            const match = i.id.match(/S-(\d+)/);
            return match ? parseInt(match[1]) : 0;
        }));
        professionalCounterRef.current = maxProfId + 1;
        standardizedCounterRef.current = maxStdId + 1;

        setCurrentHistoryId(id);
        setActiveTab("professional");
        setStep("review");
        setShowHistory(false);
    };

    const handleExportHistory = async (id: string) => {
        try {
            await historyService.exportGeneration(id);
        } catch (error) {
            console.error('Export failed:', error);
            alert('Failed to export generation');
        }
    };

    const handleDeleteHistory = (id: string) => {
        if (confirm('Delete this generation from history?')) {
            historyService.deleteEntry(id);
            if (currentHistoryId === id) {
                setCurrentHistoryId(null);
            }
            refreshHistory();
        }
    };

    const handleClearAllHistory = () => {
        if (confirm('Clear all generation history? This cannot be undone.')) {
            historyService.clearHistory();
            setCurrentHistoryId(null);
            refreshHistory();
        }
    };

    // Get current items based on active tab
    const getCurrentItems = () => {
        return activeTab === "professional" ? professionalItems : standardizedItems;
    };

    const setCurrentItems = (updater: (prev: BOQItem[]) => BOQItem[]) => {
        if (activeTab === "professional") {
            setProfessionalItems(updater);
        } else {
            setStandardizedItems(updater);
        }
    };

    const handleUpdateQuantity = (id: string, qty: number) => {
        setCurrentItems(prev =>
            prev.map(item => item.id === id ? { ...item, boqQty: qty } : item)
        );
    };

    const handleRemove = (id: string) => {
        setCurrentItems(prev => prev.filter(item => item.id !== id));
    };

    const handleUpdateMaterial = (material: Material) => {
        setCurrentItems(prev =>
            prev.map(item => item.id === material.id ? { ...item, ...material } : item)
        );
    };

    const handleAddMaterial = (material: Material) => {
        const counterRef = activeTab === "professional" ? professionalCounterRef : standardizedCounterRef;
        const prefix = activeTab === "professional" ? "P" : "S";
        const newItem: BOQItem = {
            ...material,
            id: `${prefix}-${String(counterRef.current++).padStart(3, '0')}`,
            boqQty: 1,
            remarks: ""
        };
        setCurrentItems(prev => [...prev, newItem]);
    };

    const handleUpdateRemark = (_id: string, _remark: string) => {
        // No-op: remarks are not editable in AI generator
    };

    const handleReorder = (newItems: BOQItem[]) => {
        if (activeTab === "professional") {
            setProfessionalItems(newItems);
        } else {
            setStandardizedItems(newItems);
        }
    };

    const handleCopyToClipboard = () => {
        const items = getCurrentItems();
        const header = "S:NO\tDESCRIPTION\tCATEGORY\tQTY UNITS";
        const rows = items.map((item, idx) => {
            return `${idx + 1}\t${item.description || ""}\t${item.category || ""}\t${item.boqQty || 0} ${item.unit || ""}`;
        }).join("\n");

        navigator.clipboard.writeText(`${header}\n${rows}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleAddToBOQ = () => {
        // Add items from the active tab to the project
        const items = getCurrentItems();
        onAddMaterials(items);
        setOpen(false);
        setStep("input");
        setFiles([]);
        setDescription("");
        setProfessionalItems([]);
        setStandardizedItems([]);
        professionalCounterRef.current = 1;
        standardizedCounterRef.current = 1;
        setCurrentHistoryId(null);
        setStandardizedGenerated(false);
    };

    const hasItems = professionalItems.length > 0 || standardizedItems.length > 0;

    const formatDate = (isoString: string) => {
        const date = new Date(isoString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
                    <div className="flex items-center justify-between">
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <Sparkles className="h-5 w-5 text-indigo-500" />
                            AI Material Generator
                        </DialogTitle>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowHistory(!showHistory)}
                            className={`gap-2 ${showHistory ? 'bg-indigo-50 text-indigo-700' : ''}`}
                        >
                            <History className="h-4 w-4" />
                            History ({historySummaries.length})
                            {showHistory ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        </Button>
                    </div>
                </DialogHeader>

                <div className={`flex-1 flex overflow-hidden w-full ${isResizing ? 'select-none' : ''}`} ref={containerRef}>
                    {/* Left Sidebar - Input */}
                    <aside
                        className="flex-shrink-0 flex flex-col h-full bg-card transition-[width] duration-200 ease-out"
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
                                ) : hasItems ? (
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
                        </div>
                    </aside>



                    {/* Resizable Handle */}
                    <div
                        className="w-4 bg-transparent hover:bg-primary/10 cursor-col-resize flex items-center justify-center relative group transition-colors -ml-0 z-10"
                        onMouseDown={startResizing}
                    >
                        <div className="absolute inset-y-0 w-px bg-border group-hover:bg-primary/50 transition-colors left-1/2 -translate-x-1/2" />
                        <div className="bg-background border shadow-sm rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity absolute pointer-events-none transform -translate-x-1 shadow-md">
                            <ArrowLeftRight className="h-3 w-3 text-muted-foreground" />
                        </div>
                    </div>

                    {/* Right Content - Results with Tabs */}
                    <main
                        className="flex-1 flex flex-col overflow-hidden relative bg-background min-w-0"
                    >
                        {step === "processing" ? (
                            <div className="absolute inset-0 z-10 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-4">
                                <div className="p-4 rounded-full bg-indigo-50 animate-pulse">
                                    <Loader2 className="h-12 w-12 animate-spin text-indigo-600" />
                                </div>
                                <div className="text-center space-y-1">
                                    <h3 className="font-semibold text-xl text-indigo-900">Analyzing Requirements...</h3>
                                    <p className="text-muted-foreground">Identifying materials and matching to D&C standards.</p>
                                </div>
                            </div>
                        ) : null}

                        {hasItems ? (
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
                                {/* Tab Header with Actions */}
                                <div className="flex items-center justify-between px-6 py-3 border-b bg-white">
                                    <TabsList className="grid grid-cols-2 w-auto">
                                        {TABLE_TABS.map(tab => (
                                            <TabsTrigger key={tab.id} value={tab.id} className="px-6">
                                                {tab.label}
                                                {tab.id === "professional" ? (
                                                    <span className="ml-2 flex items-center gap-1">
                                                        <Check className="h-3 w-3 text-green-600" />
                                                        <span className="text-xs text-muted-foreground">({professionalItems.length})</span>
                                                    </span>
                                                ) : (
                                                    <span className="ml-2 flex items-center gap-1">
                                                        {standardizedGenerated ? (
                                                            <Check className="h-3 w-3 text-green-600" />
                                                        ) : isStandardizing ? (
                                                            <Loader2 className="h-3 w-3 text-indigo-500 animate-spin" />
                                                        ) : (
                                                            <span className="h-2 w-2 rounded-full bg-amber-400" />
                                                        )}
                                                        <span className="text-xs text-muted-foreground">
                                                            {standardizedGenerated ? `(${standardizedItems.length})` : isStandardizing ? '(Generating...)' : '(Pending)'}
                                                        </span>
                                                    </span>
                                                )}
                                            </TabsTrigger>
                                        ))}
                                    </TabsList>
                                    <div className="flex items-center gap-2">
                                        {currentHistoryId && (
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleExportHistory(currentHistoryId)}
                                                className="h-9"
                                            >
                                                <Download className="h-4 w-4 mr-2" />
                                                Export
                                            </Button>
                                        )}
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

                                {/* Tab Contents */}
                                <TabsContent value="professional" className="flex-1 m-0 overflow-hidden">
                                    <ScrollArea className="h-full">
                                        <div className="p-6">
                                            <BOQTable
                                                items={professionalItems}
                                                onUpdateQuantity={handleUpdateQuantity}
                                                onRemove={handleRemove}
                                                onAddMaterial={handleAddMaterial}
                                                onUpdateRemark={handleUpdateRemark}
                                                onUpdateMaterial={handleUpdateMaterial}
                                                onReorder={handleReorder}
                                                isPriceVisible={false}
                                                hideRemark={true}
                                            />
                                        </div>
                                    </ScrollArea>
                                </TabsContent>

                                <TabsContent value="standardized" className="flex-1 m-0 overflow-hidden">
                                    {isStandardizing ? (
                                        /* D&C Generating in Background - Show Loading */
                                        <div className="flex-1 flex flex-col items-center justify-center p-8 h-full">
                                            <div className="max-w-md text-center space-y-6">
                                                <div className="h-20 w-20 mx-auto rounded-full bg-indigo-50 flex items-center justify-center animate-pulse">
                                                    <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-xl font-semibold text-slate-700">Generating D&C Standards...</h3>
                                                    <p className="text-slate-500">
                                                        Matching your {professionalItems.length} materials to D&C company naming conventions.
                                                        You can continue reviewing the Professional list.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : !standardizedGenerated ? (
                                        /* D&C Failed or Not Started - Show Error State */
                                        <div className="flex-1 flex flex-col items-center justify-center p-8 h-full">
                                            <div className="max-w-md text-center space-y-6">
                                                <div className="h-20 w-20 mx-auto rounded-full bg-amber-50 flex items-center justify-center">
                                                    <Sparkles className="h-10 w-10 text-amber-500" />
                                                </div>
                                                <div className="space-y-2">
                                                    <h3 className="text-xl font-semibold text-slate-700">D&C Standards Pending</h3>
                                                    <p className="text-slate-500">
                                                        Generate new materials to automatically create D&C standardized versions.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        /* D&C Generated - Show Table */
                                        <ScrollArea className="h-full">
                                            <div className="p-6">
                                                <BOQTable
                                                    items={standardizedItems}
                                                    onUpdateQuantity={handleUpdateQuantity}
                                                    onRemove={handleRemove}
                                                    onAddMaterial={handleAddMaterial}
                                                    onUpdateRemark={handleUpdateRemark}
                                                    onUpdateMaterial={handleUpdateMaterial}
                                                    onReorder={handleReorder}
                                                    isPriceVisible={false}
                                                    hideRemark={true}
                                                />
                                            </div>
                                        </ScrollArea>
                                    )}
                                </TabsContent>
                            </Tabs>
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

                    {/* History Panel (Collapsible) */}
                    {showHistory && (
                        <aside className="w-72 flex-shrink-0 flex flex-col h-full bg-slate-50 border-l">
                            <div className="p-4 border-b bg-white flex items-center justify-between">
                                <h2 className="font-semibold text-base tracking-tight flex items-center gap-2">
                                    <History className="h-4 w-4 text-slate-500" />
                                    History
                                </h2>
                                {historySummaries.length > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleClearAllHistory}
                                        className="text-xs text-slate-500 hover:text-red-600 h-7 px-2"
                                    >
                                        Clear All
                                    </Button>
                                )}
                            </div>

                            <ScrollArea className="flex-1">
                                {historySummaries.length === 0 ? (
                                    <div className="p-6 text-center text-slate-400">
                                        <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                                        <p className="text-sm">No history yet</p>
                                        <p className="text-xs mt-1">Generations will appear here</p>
                                    </div>
                                ) : (
                                    <div className="p-2 space-y-2">
                                        {historySummaries.map((summary) => (
                                            <div
                                                key={summary.id}
                                                className={`p-3 rounded-lg border bg-white hover:shadow-sm transition-all cursor-pointer ${currentHistoryId === summary.id ? 'border-indigo-300 bg-indigo-50' : 'border-slate-200'}`}
                                                onClick={() => handleRestoreFromHistory(summary.id)}
                                            >
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs text-slate-500 mb-1">
                                                            {formatDate(summary.timestamp)}
                                                        </p>
                                                        <p className="text-sm font-medium text-slate-700 line-clamp-2">
                                                            {summary.promptPreview || '(No prompt)'}
                                                        </p>
                                                        <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
                                                            {summary.imageCount > 0 && (
                                                                <span className="flex items-center gap-1">
                                                                    <Upload className="h-3 w-3" />
                                                                    {summary.imageCount}
                                                                </span>
                                                            )}
                                                            <span>{summary.itemCounts.professional + summary.itemCounts.standardized} items</span>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 mt-2 pt-2 border-t">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRestoreFromHistory(summary.id);
                                                        }}
                                                        className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                                    >
                                                        <RotateCcw className="h-3 w-3 mr-1" />
                                                        Restore
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleExportHistory(summary.id);
                                                        }}
                                                        className="h-7 px-2 text-xs text-slate-600 hover:text-slate-700"
                                                    >
                                                        <Download className="h-3 w-3 mr-1" />
                                                        Export
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteHistory(summary.id);
                                                        }}
                                                        className="h-7 px-2 text-xs text-slate-400 hover:text-red-600 ml-auto"
                                                    >
                                                        <Trash2 className="h-3 w-3" />
                                                    </Button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </ScrollArea>
                        </aside>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
