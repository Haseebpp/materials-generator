export interface MaterialDetails {
    thickness: string;
    dimensions: string;
    size: string;
    length: string;
    color: string;
    grade: string;
}

export interface Material {
    id: string;
    category: string;
    description: string;
    details: MaterialDetails;
    qty: string;
    unit: string;
    rate: string;
}

export interface BOQItem extends Material {
    boqQty: number;
}
