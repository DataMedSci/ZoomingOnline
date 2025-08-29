/**
 * URL Parameter Utilities for Data Selection and Visualization
 *
 * This module provides utilities for handling URL parameters related to data selection
 * (data URL, channel, trc, segment) in a pure Svelte 5 style without using stores.
 */

import { page } from '$app/state';

// Types for URL parameters
export interface SelectionParams {
  data?: string | undefined;
  channel?: string | undefined;
  trc?: string | undefined;
  segment?: string | undefined;
}

export interface ValidatedSelectionParams extends SelectionParams {
  channel: string;
  trc: string;
  segment: string;
}

// Default values
export const DEFAULT_SELECTION_PARAMS: ValidatedSelectionParams = {
  channel: '1',
  trc: '1',
  segment: '1'
};

/**
 * Extract all selection parameters from current URL
 */
export function getSelectionParamsFromUrl(): SelectionParams {
  const url = new URL(page.url);
  return {
    data: url.searchParams.get('data') || undefined,
    channel: url.searchParams.get('channel') || undefined,
    trc: url.searchParams.get('trc') || undefined,
    segment: url.searchParams.get('segment') || undefined
  };
}

/**
 * Extract a specific parameter from current URL with fallback
 */
export function getUrlParam(paramName: keyof SelectionParams, fallback: string = ''): string {
  const url = new URL(page.url);
  return url.searchParams.get(paramName) || fallback;
}

/**
 * Validate and normalize selection parameters against available options
 */
export function validateSelectionParams(
  params: SelectionParams,
  availableOptions: {
    channels: string[];
    trcFiles: string[];
    segments: string[];
  }
): ValidatedSelectionParams {
  const validated: ValidatedSelectionParams = { ...DEFAULT_SELECTION_PARAMS };

  // Validate channel - if options are empty, keep default
  if (params.channel && availableOptions.channels.length > 0 && availableOptions.channels.includes(params.channel)) {
    validated.channel = params.channel;
  }

  // Validate trc - if options are empty, keep default
  if (params.trc && availableOptions.trcFiles.length > 0 && availableOptions.trcFiles.includes(params.trc)) {
    validated.trc = params.trc;
  }

  // Validate segment - if options are empty, keep default
  if (params.segment && availableOptions.segments.length > 0 && availableOptions.segments.includes(params.segment)) {
    validated.segment = params.segment;
  }

  // Preserve data parameter if present
  if (params.data) {
    validated.data = params.data;
  }

  return validated;
}

/**
 * Build URL with selection parameters
 */
export function buildUrlWithParams(basePath: string, params: SelectionParams): string {
  const searchParams = new URLSearchParams();

  if (params.data) searchParams.set('data', params.data);
  if (params.channel) searchParams.set('channel', params.channel);
  if (params.trc) searchParams.set('trc', params.trc);
  if (params.segment) searchParams.set('segment', params.segment);

  const paramString = searchParams.toString();
  return paramString ? `${basePath}?${paramString}` : basePath;
}

/**
 * Convert validated parameters to indices (0-based)
 */
export function paramsToIndices(params: ValidatedSelectionParams): {
  channelIndex: number;
  trcIndex: number;
  segmentIndex: number;
} {
  return {
    channelIndex: parseInt(params.channel) - 1,
    trcIndex: parseInt(params.trc) - 1,
    segmentIndex: parseInt(params.segment) - 1
  };
}

/**
 * Convert indices to display values (1-based)
 */
export function indicesToDisplayValues(indices: {
  channelIndex: number;
  trcIndex: number;
  segmentIndex: number;
}): {
  channel: string;
  trc: string;
  segment: string;
} {
  return {
    channel: (indices.channelIndex + 1).toString(),
    trc: (indices.trcIndex + 1).toString(),
    segment: (indices.segmentIndex + 1).toString()
  };
}

/**
 * Convert selection values (strings or numbers) to numeric 0-based indices.
 * This helper should be used only when a consumer needs numeric indices for
 * array access (for example when calling into the renderer). Prefer using
 * the raw selection values across the app to avoid assumptions about base.
 */
export function valuesToNumericIndices(params: ValidatedSelectionParams): {
  channelIndex: number;
  trcIndex: number;
  segmentIndex: number;
} {
  const c = Number.parseInt(params.channel || '1', 10);
  const t = Number.parseInt(params.trc || '1', 10);
  const s = Number.parseInt(params.segment || '1', 10);

  return {
    channelIndex: Number.isFinite(c) ? c - 1 : 0,
    trcIndex: Number.isFinite(t) ? t - 1 : 0,
    segmentIndex: Number.isFinite(s) ? s - 1 : 0,
  };
}

/**
 * Create a derived rune for URL parameters with validation
 * NOTE: This function is deprecated. Use validateSelectionParams directly in Svelte components.
 */
export function createValidatedParamsRune(
  _availableOptions: {
    channels: string[];
    trcFiles: string[];
    segments: string[];
  }
) {
  // This function is deprecated and should not be used
  // Use validateSelectionParams directly in Svelte components instead
  throw new Error('createValidatedParamsRune is deprecated. Use validateSelectionParams directly.');
}

/**
 * Create a derived rune for parameter indices
 * NOTE: This function is deprecated. Use paramsToIndices directly in Svelte components.
 */
export function createIndicesRune(validatedParams: ValidatedSelectionParams) {
  // This function is deprecated and should not be used
  // Use $derived(() => paramsToIndices(validatedParams)) in Svelte components instead
  throw new Error('createIndicesRune is deprecated. Use paramsToIndices directly.');
}

/**
 * Navigation helper that preserves all current parameters
 */
export function createNavigationWithParams(basePath: string) {
  return () => {
    const currentParams = getSelectionParamsFromUrl();
    return buildUrlWithParams(basePath, currentParams);
  };
}

/**
 * Check if parameters have changed from defaults
 */
export function hasCustomSelection(params: ValidatedSelectionParams): boolean {
  return (
    params.channel !== DEFAULT_SELECTION_PARAMS.channel ||
    params.trc !== DEFAULT_SELECTION_PARAMS.trc ||
    params.segment !== DEFAULT_SELECTION_PARAMS.segment
  );
}

/**
 * Get shareable URL with current selection
 */
export function getShareableUrl(): string {
  const params = getSelectionParamsFromUrl();
  const currentUrl = new URL(window.location.href);
  const shareUrl = new URL(currentUrl.pathname, currentUrl.origin);

  if (params.data) shareUrl.searchParams.set('data', params.data);
  if (params.channel && params.channel !== '1') shareUrl.searchParams.set('channel', params.channel);
  if (params.trc && params.trc !== '1') shareUrl.searchParams.set('trc', params.trc);
  if (params.segment && params.segment !== '1') shareUrl.searchParams.set('segment', params.segment);

  return shareUrl.toString();
}