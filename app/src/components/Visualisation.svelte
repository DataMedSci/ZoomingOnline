<script lang="ts">
  import { openZarr } from '$lib/dataService';
  import ShareButton from './ShareButton.svelte';
  import { onMount } from 'svelte';

  let {
    dataURLParam,
    channelIndex = -1 as number,
    trcIndex = -1 as number,
    segmentIndex = -1 as number,
    defaultZoom1Level = -1 as number,
    defaultZoom2Level = -1 as number,
    defaultZoom1IndexPos = -1 as number,
    defaultZoom2IndexPos = -1 as number,
  }: {
    dataURLParam: string;
    channelIndex?: number;
    trcIndex?: number;
    segmentIndex?: number;
    defaultZoom1Level?: number;
    defaultZoom2Level?: number;
    defaultZoom1IndexPos?: number;
    defaultZoom2IndexPos?: number;
  } = $props();

  let shape: number[] = [];
  let channelCount: number = 0;
  let trcCount: number = 0;
  let segmentCount: number = 0;
  let samplesCount: number = 0;

  onMount(async () => {
    const { zarrGroup, rawStore, overviewStore } = await openZarr(dataURLParam);
    shape = await rawStore.shape;
    samplesCount = shape.length === 4 ? shape[3] : 0;
    trcCount = shape.length >= 2 ? shape[1] : 0;
    segmentCount = shape.length >= 3 ? shape[2] : 0;
    channelCount = shape.length >= 1 ? shape[0] : 0;
  });
</script>

<div class="w-full h-full flex items-center justify-center text-gray-500 italic">
  <!-- list props -->
  <div class="mt-4 text-left text-sm text-gray-400">
    <p><strong>Data URL:</strong> {dataURLParam || 'N/A'}</p>
    <p><strong>Channel Index:</strong> {channelIndex}</p>
    <p><strong>TRC Index:</strong> {trcIndex}</p>
    <p><strong>Segment Index:</strong> {segmentIndex}</p>
    <p><strong>Shape:</strong> {shape.length > 0 ? shape.join(' x ') : 'N/A'}</p>
    <p><strong>Zoom Level 1:</strong> {defaultZoom1Level}</p>
    <p><strong>Zoom Level 2:</strong> {defaultZoom2Level}</p>
    <p><strong>Zoom 1 Position:</strong> {defaultZoom1IndexPos}</p>
    <p><strong>Zoom 2 Position:</strong> {defaultZoom2IndexPos}</p>
  </div>
</div>

<div class="w-full">
  <div class="flex justify-between items-center mb-4 p-4 bg-white rounded-lg shadow-md">
    <div class="flex-col items-center gap-4">
      <div class="flex items-center gap-2 text-sm text-gray-600">
        <span class="font-semibold text-gray-800">Channel:</span>
        <span class="text-blue-600 font-medium">{channelIndex} / {channelCount}</span>
        <span class="text-gray-500 mx-1">|</span>
        <span class="font-semibold text-gray-800">TRC:</span>
        <span class="text-blue-600 font-medium">{trcIndex} / {trcCount}</span>
        <span class="text-gray-500 mx-1">|</span>
        <span class="font-semibold text-gray-800">Segment:</span>
        <span class="text-blue-600 font-medium">{segmentIndex} / {segmentCount}</span>
        <span class="text-gray-500 mx-1">|</span>
      </div>
      <!-- <div class="flex items-center gap-2 text-sm text-gray-600">
        <span class="font-semibold text-gray-800">Samples per segment:</span>
        <span class="text-blue-600 font-medium">{samplesCount}</span>
        <span class="text-gray-500 mx-1">|</span>
        <span class="font-semibold text-gray-800">Time between samples:</span>
        <span class="text-blue-600 font-medium">{timeBetweenSamplesSec}s</span>
        <span class="text-gray-500 mx-1">|</span>
        <span class="font-semibold text-gray-800">Segment duration:</span>
        <span class="text-blue-600 font-medium">{segmentDurationSec}s</span>
      </div> -->
      <div class="flex items-center gap-2 text-sm text-gray-600">
        <span class="font-semibold text-gray-800">Zoom 1:</span>
        <span class="text-blue-600 font-medium">Level {defaultZoom1Level} @ {defaultZoom1IndexPos}</span>
        <span class="text-gray-500 mx-1">|</span>
        <span class="font-semibold text-gray-800">Zoom 2:</span>
        <span class="text-blue-600 font-medium">Level {defaultZoom2Level} @ {defaultZoom2IndexPos}</span>
      </div>
      <!-- <button class="p-2 bg-emerald-500 text-white font-medium rounded-lg hover:scale-105 w-full md:w-auto max-w-xs" onclick={selectData}>Select Data</button> -->
      <div class="mt-4">
        <!-- {#if Object.keys(zoom1DefaultLevels).length > 0}
          <div class="text-sm text-gray-600">
            <span class="font-semibold text-gray-800">Zoom 1 Levels:</span>
            <div class="flex flex-col gap-2 mt-2">
              {#each Object.entries(zoom1DefaultLevels) as [level, label]}
                <span class="text-blue-600 font-medium">Level {level}: value: {label.value} / label: {label.label}</span>
              {/each}
            </div>
          </div>
        {/if} -->
      </div>
      <!-- <ZoomControls bind:zoomLevel={zoom1LevelParam} minZoomWindow={timeBetweenSamplesSec} maxZoomWindow={segmentDurationSec} defaultZoomLevel={defaultZoom1Level} />
      <ZoomControls
        bind:zoomLevel={zoom2LevelParam}
        minZoomWindow={timeBetweenSamplesSec}
        maxZoomWindow={zoom1DefaultLevels.at(zoom1LevelParam)?.value || segmentDurationSec}
        defaultZoomLevel={defaultZoom2Level}
      /> -->
    </div>
    <ShareButton />
  </div>
</div>
