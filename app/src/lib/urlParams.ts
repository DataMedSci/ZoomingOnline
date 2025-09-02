import { page } from "$app/state";

export function parseParamInt(name: string, defaultValue: number = 1): number {
        const value = parseInt(page.url.searchParams.get(name) || '');
        return isNaN(value) ? defaultValue : value;
}

export function stripURLFromHashAndAttributes(url: string): string {
    try {
        const parsedUrl = new URL(url);
        parsedUrl.hash = '';
        parsedUrl.search = '';
        return parsedUrl.toString();
    } catch {
        return url;
    }
}