export interface Listing {
    id: number;
    title: string;
    price: number;
    price_eur?: number;
    sqm: number;
    neighborhood: string;
    source_platform: string;
    image_url?: string;
    listing_url?: string;
    transaction_type: 'SALE' | 'RENT';
    latitude?: number;
    longitude?: number;
    rooms?: number;
    floor?: number;
}