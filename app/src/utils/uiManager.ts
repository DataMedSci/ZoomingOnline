/**
 * uiManager.ts
 *
 * Manages user interface elements and interactions for the ZoomingOnline application.
 * Handles populating selectors, managing UI state, and clipboard functionality.
 * Adapted for Svelte store-based state management.
 */


/**
 * Interface for data store with shape information
 */
interface DataStore {
  shape: number[];
  [key: string]: any;
}
