/**
 * Consolidated Store Exports
 *
 * Single source of truth for all app state management
 */

// Import actions first for individual exports
import { actions } from "./appState";

// Export the consolidated state and actions
export {
  appState,
  dataState,
  plotState,
  uiState,
  actions,

  // Key derived values
  isDataReady,
  isDataReadyForPlot,
  canInteract,
  selectorOptions,

  // Backward compatibility exports (for components not yet migrated)
  rawStore,
  overviewStore,
  zarrGroup,
  isDataLoaded,
  dataUrl,
  isLoading,
  error,
  showCopyLink,
  zoomWidth,
  plotConfig,
} from "./appState";

// Export individual action functions for backward compatibility
export const setError = actions.setError;
export const setLoadingState = actions.setLoading;

// Services
export { ZoomService } from "../services/zoomService";
export { loadZarrData, getRawDataSlice } from "../services/dataService";

// Types (only the essential ones)
export type {
  ZarrGroup,
  RawDataStore,
  OverviewStore,
  PlotConfig,
  CurrentView,
} from "../types/stores";
