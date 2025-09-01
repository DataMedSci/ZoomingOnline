<script>
  import { createEventDispatcher } from 'svelte';
  import { generateZoomLevelsWithLabels } from '../../utils/zoomLevels';

  let { timeBetweenPoints, segmentDuration } = $props();

  // State using $state rune
  let selectedZoomLevel = $state();
  let defaultSet = $state(false);
  let canZoomIn = $state(true);
  let canZoomOut = $state(true);

  // Generate zoom levels dynamically based on data characteristics
  const zoomLevels = $derived(timeBetweenPoints && segmentDuration ? generateZoomLevelsWithLabels(timeBetweenPoints, segmentDuration) : []);
</script>

<div class="zoom-controls bg-white p-3 rounded-lg shadow-md min-w-[200px] max-w-[240px]">
  <h3 class="text-lg font-semibold text-gray-800 m-0 mb-4">Zoom Level</h3>

  <!-- Zoom Level -->
  <div class="mb-6">
    <div class="flex gap-2 mb-4">
      <button
        title="Zoom In"
        disabled={!canZoomIn}
        class="flex-1 flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all cursor-pointer {canZoomIn
          ? 'bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-0.5'
          : 'bg-gray-400 cursor-not-allowed'}"
      >
        ➕ In
      </button>
      <button
        title="Reset to defaults"
        class="flex-1 flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all cursor-pointer bg-blue-500 hover:bg-blue-600 hover:-translate-y-0.5"
      >
        🎯 Defaults
      </button>
      <button
        onclick={handleZoomOut}
        title="Zoom Out"
        disabled={!canZoomOut}
        class="flex-1 flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all cursor-pointer {canZoomOut
          ? 'bg-amber-500 hover:bg-amber-600 hover:-translate-y-0.5'
          : 'bg-gray-400 cursor-not-allowed'}"
      >
        ➖ Out
      </button>
    </div>

    <div class="mb-2">
      <select
        id="zoomSelect"
        bind:value={selectedZoomLevel}
        onchange={handleDropdownChange}
        class="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white cursor-pointer transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {#each zoomLevels as level}
          <option value={level.value}>
            {level.label}
          </option>
        {/each}
      </select>
    </div>

    {#if selectedZoomLevel}
      <div class="p-2 bg-blue-50 text-blue-800 rounded-md text-xs text-center">
        Current: {zoomLevels.find((l) => l.value === selectedZoomLevel)?.label || 'Custom'}
      </div>
    {/if}
  </div>

  {#if zoomLevels.length === 0}
    <div class="text-xs text-gray-600 text-center mt-4">No zoom levels available</div>
  {/if}
</div>
