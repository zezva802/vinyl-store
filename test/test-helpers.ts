import { API_BASE_URL } from './test-setup';

export async function createTestUser(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string
): Promise<{ token: string; id: string; email: string }> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password,
            firstName,
            lastName,
        }),
    });

    if (!response.ok) {
        throw new Error(`Failed to create user: ${response.statusText}`);
    }

    const data = await response.json();
    return {
        token: data.accessToken,
        id: data.user.id,
        email: data.user.email,
    };
}

/**
 * Login and get token
 */
export async function login(
    email: string,
    password: string
): Promise<string> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
        throw new Error(`Login failed: ${response.statusText}`);
    }

    const data = await response.json();
    return data.accessToken;
}

/**
 * Create a vinyl record (requires admin token)
 */
export async function createVinyl(
    adminToken: string,
    vinylData: {
        name: string;
        authorName: string;
        description: string;
        price: number;
        imageUrl?: string;
    }
): Promise<{ id: string; [key: string]: any }> {
    const response = await fetch(`${API_BASE_URL}/vinyls`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify(vinylData),
    });

    if (!response.ok) {
        throw new Error(`Failed to create vinyl: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Create a review
 */
export async function createReview(
    userToken: string,
    reviewData: {
        vinylId: string;
        comment: string;
        score: number;
    }
): Promise<{ id: string; [key: string]: any }> {
    const response = await fetch(`${API_BASE_URL}/reviews`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(reviewData),
    });

    if (!response.ok) {
        throw new Error(`Failed to create review: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Promote user to admin role (direct database access)
 */
export async function promoteToAdmin(
    dataSource: any,
    userId: string
): Promise<void> {
    await dataSource.query('UPDATE users SET role = ? WHERE id = ?', [
        'admin',
        userId,
    ]);
}

/**
 * Wait for condition with timeout
 */
export async function waitFor(
    condition: () => Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
): Promise<void> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeout) {
        if (await condition()) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, interval));
    }

    throw new Error('Timeout waiting for condition');
}

/**
 * Make authenticated request
 */
export async function authenticatedRequest(
    endpoint: string,
    token: string,
    options: RequestInit = {}
): Promise<Response> {
    return fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
            ...options.headers,
            Authorization: `Bearer ${token}`,
        },
    });
}

/**
 * Assert response status
 */
export function assertStatus(
    response: Response,
    expectedStatus: number
): void {
    if (response.status !== expectedStatus) {
        throw new Error(
            `Expected status ${expectedStatus} but got ${response.status}`
        );
    }
}

/**
 * Assert response contains data
 */
export async function assertHasData(response: Response): Promise<any> {
    const data = await response.json();
    if (!data) {
        throw new Error('Response has no data');
    }
    return data;
}

/**
 * Create multiple test vinyls at once
 */
export async function createMultipleVinyls(
    adminToken: string,
    count: number,
    prefix: string = 'Test Album'
): Promise<string[]> {
    const vinylIds: string[] = [];

    for (let i = 0; i < count; i++) {
        const vinyl = await createVinyl(adminToken, {
            name: `${prefix} ${i + 1}`,
            authorName: `Artist ${i + 1}`,
            description: `Description for album ${i + 1}`,
            price: 19.99 + i,
        });
        vinylIds.push(vinyl.id);
    }

    return vinylIds;
}

/**
 * Create multiple reviews for a vinyl
 */
export async function createMultipleReviews(
    vinylId: string,
    users: Array<{ token: string }>,
    scores: number[]
): Promise<string[]> {
    const reviewIds: string[] = [];

    for (let i = 0; i < users.length && i < scores.length; i++) {
        const review = await createReview(users[i].token, {
            vinylId,
            comment: `Review ${i + 1}`,
            score: scores[i],
        });
        reviewIds.push(review.id);
    }

    return reviewIds;
}

/**
 * Get vinyl with average score
 */
export async function getVinylWithScore(
    vinylId: string
): Promise<{ averageScore: number; [key: string]: any }> {
    const response = await fetch(`${API_BASE_URL}/vinyls/${vinylId}`);

    if (!response.ok) {
        throw new Error(`Failed to get vinyl: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Clean up test data by IDs
 */
export async function cleanupVinyls(
    adminToken: string,
    vinylIds: string[]
): Promise<void> {
    for (const id of vinylIds) {
        await fetch(`${API_BASE_URL}/vinyls/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${adminToken}` },
        });
    }
}

/**
 * Clean up reviews
 */
export async function cleanupReviews(
    token: string,
    reviewIds: string[]
): Promise<void> {
    for (const id of reviewIds) {
        await fetch(`${API_BASE_URL}/reviews/${id}`, {
            method: 'DELETE',
            headers: { Authorization: `Bearer ${token}` },
        });
    }
}

/**
 * Generate random email for testing
 */
export function generateTestEmail(prefix: string = 'test'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    return `${prefix}-${timestamp}-${random}@test.com`;
}

/**
 * Generate random vinyl data
 */
export function generateVinylData(index?: number) {
    const suffix = index !== undefined ? ` ${index}` : '';
    return {
        name: `Test Album${suffix}`,
        authorName: `Test Artist${suffix}`,
        description: `Description for test album${suffix}`,
        price: 19.99 + (index || 0),
        imageUrl: `https://example.com/album${suffix || ''}.jpg`,
    };
}

/**
 * Assert array contains item matching predicate
 */
export function assertArrayContains<T>(
    array: T[],
    predicate: (item: T) => boolean,
    message?: string
): void {
    if (!array.some(predicate)) {
        throw new Error(message || 'Array does not contain expected item');
    }
}

/**
 * Assert array is sorted
 */
export function assertSorted<T>(
    array: T[],
    compareFn: (a: T, b: T) => number,
    message?: string
): void {
    for (let i = 0; i < array.length - 1; i++) {
        if (compareFn(array[i], array[i + 1]) > 0) {
            throw new Error(
                message || `Array not sorted at index ${i}: ${array[i]} > ${array[i + 1]}`
            );
        }
    }
}

/**
 * Mock Stripe payment for testing
 */
export interface MockPaymentData {
    vinylId: string;
    amount: number;
}

export async function createMockPayment(
    userToken: string,
    vinylId: string
): Promise<{ clientSecret: string; orderId: string; amount: number }> {
    const response = await fetch(
        `${API_BASE_URL}/orders/create-payment-intent`,
        {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${userToken}`,
            },
            body: JSON.stringify({ vinylId }),
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to create payment: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get user orders
 */
export async function getUserOrders(
    userToken: string
): Promise<Array<{ id: string; [key: string]: any }>> {
    const response = await fetch(`${API_BASE_URL}/orders`, {
        headers: { Authorization: `Bearer ${userToken}` },
    });

    if (!response.ok) {
        throw new Error(`Failed to get orders: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get user profile
 */
export async function getUserProfile(userToken: string): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
        headers: { Authorization: `Bearer ${userToken}` },
    });

    if (!response.ok) {
        throw new Error(`Failed to get profile: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Update user profile
 */
export async function updateUserProfile(
    userToken: string,
    updates: {
        firstName?: string;
        lastName?: string;
        birthDate?: string;
        avatar?: string;
    }
): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify(updates),
    });

    if (!response.ok) {
        throw new Error(`Failed to update profile: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Search vinyls with filters
 */
export async function searchVinyls(filters: {
    search?: string;
    authorName?: string;
    page?: number;
    limit?: number;
    sortBy?: string;
    order?: 'ASC' | 'DESC';
}): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
            params.append(key, value.toString());
        }
    });

    const response = await fetch(
        `${API_BASE_URL}/vinyls?${params.toString()}`
    );

    if (!response.ok) {
        throw new Error(`Failed to search vinyls: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Get reviews with filters
 */
export async function getReviews(filters: {
    vinylId?: string;
    page?: number;
    limit?: number;
}): Promise<{
    data: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}> {
    const params = new URLSearchParams();

    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined) {
            params.append(key, value.toString());
        }
    });

    const response = await fetch(
        `${API_BASE_URL}/reviews?${params.toString()}`
    );

    if (!response.ok) {
        throw new Error(`Failed to get reviews: ${response.statusText}`);
    }

    return response.json();
}

/**
 * Delay execution
 */
export function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry function with exponential backoff
 */
export async function retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    delayMs: number = 1000
): Promise<T> {
    let lastError: Error | undefined;

    for (let i = 0; i < maxRetries; i++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error as Error;
            if (i < maxRetries - 1) {
                await delay(delayMs * Math.pow(2, i));
            }
        }
    }

    throw lastError || new Error('Retry failed');
}

/**
 * Assert response has pagination metadata
 */
export function assertHasPagination(data: any): void {
    if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Response missing data array');
    }
    if (typeof data.total !== 'number') {
        throw new Error('Response missing total count');
    }
    if (typeof data.page !== 'number') {
        throw new Error('Response missing page number');
    }
    if (typeof data.limit !== 'number') {
        throw new Error('Response missing limit');
    }
    if (typeof data.totalPages !== 'number') {
        throw new Error('Response missing totalPages');
    }
}

/**
 * Calculate expected average score
 */
export function calculateAverageScore(scores: number[]): number {
    if (scores.length === 0) return 0;
    const sum = scores.reduce((a, b) => a + b, 0);
    return Math.round((sum / scores.length) * 10) / 10;
}

/**
 * Validate UUID format
 */
export function isValidUUID(uuid: string): boolean {
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

/**
 * Assert object has required fields
 */
export function assertHasFields(obj: any, fields: string[]): void {
    for (const field of fields) {
        if (!(field in obj)) {
            throw new Error(`Object missing required field: ${field}`);
        }
    }
}

/**
 * Create test scenario with multiple users and vinyls
 */
export async function createTestScenario(adminToken: string): Promise<{
    vinyls: string[];
    users: Array<{ token: string; id: string; email: string }>;
}> {
    // Create 3 test vinyls
    const vinyls = await createMultipleVinyls(adminToken, 3, 'Scenario Album');

    // Create 3 test users
    const users: Array<{ token: string; id: string; email: string }> = [];

    for (let i = 0; i < 3; i++) {
        const user = await createTestUser(
            generateTestEmail(`scenario-user-${i}`),
            'TestPass123!',
            `User${i}`,
            'Tester'
        );
        users.push(user);
    }

    return { vinyls, users };
}