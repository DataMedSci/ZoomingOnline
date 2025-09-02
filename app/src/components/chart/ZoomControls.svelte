<script>
  import { createEventDispatcher } from 'svelte';
  import { generateZoomLevelsWithLabels } from '../../utils/zoomLevels';

  let { zoomLevel = $bindable(), timeBetweenPoints, segmentDuration } = $props();

  // State using $state rune
  let selectedZoomLevel = $derived(zoomLevel);
  const canZoomOut = $derived(selectedZoomLevel > 0);

  // Generate zoom levels dynamically based on data characteristics
  const zoomLevels = $derived(timeBetweenPoints && segmentDuration ? generateZoomLevelsWithLabels(timeBetweenPoints, segmentDuration) : []);
  const numberOfZoomLevels = $derived(zoomLevels.length);
  const canZoomIn = $derived(selectedZoomLevel < numberOfZoomLevels - 1);
  const defaultsZoomLevel = $derived(Math.max(0, numberOfZoomLevels - 3));
</script>

<div class="zoom-controls bg-white p-3 rounded-lg shadow-md min-w-[200px] max-w-[240px]">
  <h3 class="text-lg font-semibold text-gray-800 m-0 mb-4">Zoom Level</h3>

  <!-- Zoom Level -->
  <div class="mb-6">
    <div class="flex gap-2 mb-4">
      <button
        title="Zoom In"
        disabled={!canZoomIn}
        onclick={() => (selectedZoomLevel += 1)}
        class="flex-1 flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all cursor-pointer {canZoomIn
          ? 'bg-emerald-500 hover:bg-emerald-600 hover:-translate-y-0.5'
          : 'bg-gray-400 cursor-not-allowed'}"
      >
        ➕ In
      </button>
      <button
        title="Reset to defaults"
        onclick={() => (selectedZoomLevel = defaultsZoomLevel)}
        class="flex-1 flex items-center justify-center gap-1 px-4 py-2 rounded-lg text-sm font-medium text-white transition-all cursor-pointer bg-blue-500 hover:bg-blue-600 hover:-translate-y-0.5"
      >
        🎯 Defaults
      </button>
      <button
        title="Zoom Out"
        disabled={!canZoomOut}
        onclick={() => (selectedZoomLevel -= 1)}
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
        class="w-full border border-gray-300 rounded-lg p-2 text-sm bg-white cursor-pointer transition-colors focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
      >
        {#each zoomLevels as zoomObject, zoomIndex}
          <option value={zoomIndex}>
            {zoomObject.label}
          </option>
        {/each}
      </select>
    </div>
  </div>

  {#if zoomLevels.length === 0}
    <div class="text-xs text-gray-600 text-center mt-4">No zoom levels available</div>
  {/if}
</div>
