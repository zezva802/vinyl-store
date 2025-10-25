export interface DiscogsSearchResult {
    id: number;
    title: string;
    year: string;
    cover_image: string;
    master_url?: string;
    resource_url: string;
}

export interface DiscogsRelease {
    id: number;
    title: string;
    artists: Array<{ name: string }>;
    year: number;
    notes?: string;
    images?: Array<{ uri: string }>;
    community?: {
        rating?: {
            average?: number;
        };
    };
}

export interface DiscogsSearchResponse {
    results: DiscogsSearchResult[];
    pagination: {
        page: number;
        pages: number;
        items: number;
    };
}

export interface DiscogsVinylData {
    name: string;
    authorName: string;
    description: string;
    imageUrl: string | null;
    discogsId: string;
    discogsScore: number | null;
}
