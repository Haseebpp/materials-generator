import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { BOQItem } from '@/types';

const BOQ_KEY = 'boqItems';

// ─── localStorage fallbacks ──────────────────────────────────────────────────

function lsGet(): BOQItem[] {
    try {
        const d = localStorage.getItem(BOQ_KEY);
        return d ? JSON.parse(d) : [];
    } catch { return []; }
}

function lsSet(items: BOQItem[]) {
    localStorage.setItem(BOQ_KEY, JSON.stringify(items));
}

// ─── Supabase row ↔ BOQItem mappers ─────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function rowToItem(row: any): BOQItem {
    return {
        id: row.id,
        category: row.category,
        description: row.description,
        details: row.details ?? {},
        qty: row.qty ?? '',
        unit: row.unit ?? '',
        rate: row.rate ?? '',
        boqQty: row.boq_qty ?? 1,
        remarks: row.remarks ?? '',
    };
}

function itemToRow(item: BOQItem, sortOrder: number) {
    return {
        id: item.id,
        category: item.category,
        description: item.description,
        details: item.details,
        qty: item.qty,
        unit: item.unit,
        rate: item.rate,
        boq_qty: item.boqQty,
        remarks: item.remarks ?? '',
        sort_order: sortOrder,
        updated_at: new Date().toISOString(),
    };
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function loadBOQ(): Promise<BOQItem[]> {
    if (isSupabaseConfigured) {
        const { data, error } = await supabase
            .from('boq_items')
            .select('*')
            .order('sort_order', { ascending: true });
        if (error) {
            console.error('[boqService] load error:', error);
            return lsGet();
        }
        return (data ?? []).map(rowToItem);
    }
    return lsGet();
}

export async function saveBOQ(items: BOQItem[]): Promise<void> {
    if (isSupabaseConfigured) {
        // Full replace: delete all then upsert current state
        const { error: delError } = await supabase
            .from('boq_items')
            .delete()
            .neq('id', '__never__');
        if (delError) { console.error('[boqService] delete error:', delError); return; }

        if (items.length === 0) return;

        const rows = items.map((item, idx) => itemToRow(item, idx));
        const { error: upsertError } = await supabase
            .from('boq_items')
            .upsert(rows);
        if (upsertError) console.error('[boqService] upsert error:', upsertError);
    } else {
        lsSet(items);
    }
}

export async function clearBOQ(): Promise<void> {
    if (isSupabaseConfigured) {
        const { error } = await supabase
            .from('boq_items')
            .delete()
            .neq('id', '__never__');
        if (error) console.error('[boqService] clear error:', error);
    } else {
        localStorage.removeItem(BOQ_KEY);
    }
}
