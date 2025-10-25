import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import {
    DiscogsRelease,
    DiscogsSearchResponse,
    DiscogsVinylData,
} from './interfaces/discogs.interface';

@Injectable()
export class DiscogsService {
    private readonly baseUrl = 'https://api.discogs.com';
    private readonly token: string;

    constructor(private configService: ConfigService) {
        const token = this.configService.get<string>('DISCOGS_TOKEN');
        if (!token) {
            throw new Error('DISCOGS_TOKEN is not defined');
        }
        this.token = token;
    }

    private getHeaders() {
        return {
            'User-Agent': 'VinylStoreAPI/1.0',
            Authorization: `Discogs token=${this.token}`,
        };
    }

    async searchVinyls(
        query: string,
        page: number = 1
    ): Promise<DiscogsSearchResponse> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/database/search`,
                {
                    headers: this.getHeaders(),
                    params: {
                        q: query,
                        type: 'release',
                        format: 'vinyl',
                        page,
                        per_page: 20,
                    },
                }
            );

            return {
                results: response.data.results,
                pagination: response.data.pagination,
            };
        } catch (error) {
            throw new Error(
                `Discogs search failed: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    async getRelease(discogsId: string): Promise<DiscogsRelease> {
        try {
            const response = await axios.get(
                `${this.baseUrl}/releases/${discogsId}`,
                {
                    headers: this.getHeaders(),
                }
            );

            return response.data;
        } catch (error) {
            throw new Error(
                `Failed to fetch Discogs release: ${error instanceof Error ? error.message : 'Unknown error'}`
            );
        }
    }

    formatReleaseForVinyl(release: DiscogsRelease): DiscogsVinylData {
        const artistName =
            release.artists.map((a) => a.name).join(', ') || 'Unknown Artist';

        const description =
            release.notes ??
            `${artistName} - ${release.title} (${release.year})`;

        const imageUrl = release.images?.[0]?.uri ?? null;

        const discogsScore = release.community?.rating?.average ?? null;

        return {
            name: release.title,
            authorName: artistName,
            description,
            imageUrl,
            discogsId: release.id.toString(),
            discogsScore,
        };
    }
}
