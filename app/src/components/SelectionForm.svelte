<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';

  const {
    noOfChannels = 0,
    noOfTrcFiles = 0,
    noOfSegments = 0,
    defaultChannel = 1,
    defaultTrc = 1,
    defaultSegment = 1,
    dataURLParam = '',
  }: {
    noOfChannels?: number;
    noOfTrcFiles?: number;
    noOfSegments?: number;
    defaultChannel?: number;
    defaultTrc?: number;
    defaultSegment?: number;
    dataURLParam?: string;
  } = $props();

  let selectedChannel: number = $state(defaultChannel);
  let selectedTrc: number = $state(defaultTrc);
  let selectedSegment: number = $state(defaultSegment);

  function plotData() {
    goto(`${resolve('/visualization')}?data=${dataURLParam}&ch=${selectedChannel}&trc=${selectedTrc}&seg=${selectedSegment}`);
  }

  function updateURL() {
    const params = new URLSearchParams(window.location.search);
    params.set('ch', selectedChannel.toString());
    params.set('trc', selectedTrc.toString());
    params.set('seg', selectedSegment.toString());
    params.set('data', dataURLParam);
    goto(`${resolve('/selection')}?${params.toString()}`, {
      replaceState: true,
    });
  }
</script>

<div class="bg-white rounded-lg shadow-md p-6">
  <h2 class="text-xl font-semibold text-gray-900 mb-4">Selection Parameters</h2>
  <div class="flex flex-col gap-6">
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div class="flex flex-col">
        <label for="channel-select" class="mb-2 font-semibold text-gray-600">Channel:</label>
        <select id="channel-select" bind:value={selectedChannel} class="form-select" onchange={updateURL}>
          <option value="">Select Channel</option>
          {#each { length: noOfChannels } as _, i}
            <option value={i + 1}>{i + 1}</option>
          {/each}
        </select>
      </div>
      <div class="flex flex-col">
        <label for="trc-select" class="mb-2 font-semibold text-gray-600">TRC File:</label>
        <select id="trc-select" bind:value={selectedTrc} class="form-select" onchange={updateURL}>
          <option value="">Select TRC File</option>
          {#each { length: noOfTrcFiles } as _, i}
            <option value={i + 1}>{i + 1}</option>
          {/each}
        </select>
      </div>

      <div class="flex flex-col">
        <label for="segment-select" class="mb-2 font-semibold text-gray-600">Segment:</label>
        <select id="segment-select" bind:value={selectedSegment} class="form-select" onchange={updateURL}>
          <option value="">Select Segment</option>
          {#each { length: noOfSegments } as _, i}
            <option value={i + 1}>{i + 1}</option>
          {/each}
        </select>
      </div>
    </div>

    <div class="flex flex-col md:flex-row justify-center items-center gap-6 mt-8 p-6 bg-gray-50 rounded-lg border border-gray-200">
      <button
        class="px-6 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 w-full md:w-auto max-w-xs"
        onclick={plotData}
      >
        Plot Selected Data
      </button>

      <button
        class="px-6 py-2 bg-gray-500 hover:bg-gray-600 text-white font-medium rounded-lg transition-all duration-200 transform hover:scale-105 w-full md:w-auto max-w-xs"
        onclick={() => goto(resolve('/'))}
      >
        ← Load Different Dataset
      </button>
    </div>
  </div>
</div>
