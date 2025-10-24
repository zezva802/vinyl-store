import { Injectable } from '@nestjs/common';

@Injectable()
export class TokenBlacklistService {
    private blacklistedTokens: Set<string> = new Set();

    addToBlacklist(token: string): void {
        this.blacklistedTokens.add(token);
    }

    isBlacklisted(token: string): boolean {
        return this.blacklistedTokens.has(token);
    }

    removeFromBlacklist(token: string): void {
        this.blacklistedTokens.delete(token);
    }

    clearBlacklist(): void {
        this.blacklistedTokens.clear();
    }

    getBlacklistCount(): number {
        return this.blacklistedTokens.size;
    }
}
