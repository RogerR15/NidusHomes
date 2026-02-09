export interface Listing {
    id: number;
    title: string;
    price: number;
    price_eur?: number;
    sqm: number;
    neighborhood: string;
    source_platform: string;
    image_url?: string;
    images: string[];
    listing_url?: string;
    transaction_type: 'SALE' | 'RENT';
    latitude?: number;
    longitude?: number;
    rooms?: number;
    floor?: number;
    created_at: string;
    updated_at?: string;
    owner_id?: string;

    views?: number;
    favorites_count?: number;
    is_claimed?: boolean;

    ai_tags?: {
    top_tag: string;
    room_type: string;
    condition_detail: string;
    scores?: {
      room: number;
      condition: number;
    };
  } | null;
}