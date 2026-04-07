import { supabase, isSupabaseConfigured } from './supabaseClient';
import type { Material } from '@/types';
import materialsJson from '@/data/materials.json';

const localMaterials = materialsJson as Material[];

// ─── Auto-seed if materials table is empty ───────────────────────────────────

async function seedIfEmpty(): Promise<void> {
    const { count, error: countError } = await supabase
        .from('materials')
        .select('*', { count: 'exact', head: true });

    if (countError) { console.error('[materialsService] count error:', countError); return; }
    if ((count ?? 0) > 0) return; // already seeded

    console.log('[materialsService] Seeding materials table...');

    // Batch insert in chunks of 100 to avoid payload limits
    const chunkSize = 100;
    for (let i = 0; i < localMaterials.length; i += chunkSize) {
        const chunk = localMaterials.slice(i, i + chunkSize);
        const { error } = await supabase
            .from('materials')
            .upsert(chunk.map(m => ({
                id: m.id,
                category: m.category,
                description: m.description,
                details: m.details,
                qty: m.qty,
                unit: m.unit,
                rate: m.rate,
            })));
        if (error) {
            console.error('[materialsService] seed error (chunk):', error);
            return;
        }
    }
    console.log(`[materialsService] Seeded ${localMaterials.length} materials.`);
}

// ─── Public API ──────────────────────────────────────────────────────────────

export async function loadMaterials(): Promise<Material[]> {
    if (!isSupabaseConfigured) return localMaterials;

    await seedIfEmpty();

    const { data, error } = await supabase
        .from('materials')
        .select('*')
        .order('category', { ascending: true });

    if (error) {
        console.error('[materialsService] load error:', error);
        return localMaterials; // fallback to JSON
    }

    return (data ?? []) as Material[];
}

export async function upsertMaterial(material: Material): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('materials').upsert(material);
    if (error) console.error('[materialsService] upsert error:', error);
}

export async function deleteMaterial(id: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.from('materials').delete().eq('id', id);
    if (error) console.error('[materialsService] delete error:', error);
}
