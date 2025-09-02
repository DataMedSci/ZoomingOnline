<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { CircleAlert } from '@lucide/svelte';
  import { parseParamInt } from '../../lib/urlParams';
  import { openZarr, getHorizInterval } from '$lib/dataService';
  import ShareButton from '../../components/ShareButton.svelte';
  import CannotLoadState from '../../components/status/CannotLoadState.svelte';
  import LoadingState from '../../components/status/LoadingState.svelte';
  import MissingDataState from '../../components/status/MissingDataState.svelte';
  import SelectionForm from '../../components/SelectionForm.svelte';
  import { generateZoomLevelsWithLabels } from '../../utils/zoomLevels';
  import ZoomControls from '../../components/chart/ZoomControls.svelte';

  const defaultFirstZoomLevel: number = 3;
  const defaultFirstZoomFractionPos: number = 0.5;
  const defaultSecondZoomLevel: number = 3;
  const defaultSecondZoomFractionPos: number = 0.5;

  const dataURLParam: string | null = $derived(page.url.searchParams.get('data'));
  const channelURLParam: number = $derived(parseParamInt('ch'));
  const trcURLParam: number = $derived(parseParamInt('trc'));
  const segmentURLParam: number = $derived(parseParamInt('seg'));

  let zoom1LevelParam: number = $derived(parseParamInt('z1level', defaultFirstZoomLevel));
  let zoom1IndexPosParam: number = $derived(parseParamInt('z1pos', -1));
  let zoom2LevelParam: number = $derived(parseParamInt('z2level', defaultSecondZoomLevel));
  let zoom2IndexPosParam: number = $derived(parseParamInt('z2pos', -1));

  let datasetState: {
    loading: boolean;
    ready: boolean;
    error: string | null;
  } = $state({
    loading: false,
    ready: false,
    error: null as string | null,
  });

  let channelCount: number = $state(0);
  let trcCount: number = $state(0);
  let segmentCount: number = $state(0);
  let samplesCount: number = $state(0);

  let zoom1DefaultLevels = $state({});
  let timeBetweenSamplesSec: number = $state(0);
  let segmentDurationSec: number = $state(0);

  onMount(async () => {
    if (!dataURLParam) return;

    datasetState = { loading: true, ready: false, error: null };
    try {
      const zarrDataSet = await openZarr(dataURLParam);
      try {
        [channelCount, trcCount, segmentCount, samplesCount] = await zarrDataSet.rawStore.shape;
        // derive default zoom positions if not explicitly set
        zoom1IndexPosParam = zoom1IndexPosParam === -1 ? Math.floor(defaultFirstZoomFractionPos * samplesCount) : zoom1IndexPosParam;
        zoom2IndexPosParam = zoom2IndexPosParam === -1 ? Math.floor(defaultSecondZoomFractionPos * samplesCount) : zoom2IndexPosParam;

        timeBetweenSamplesSec = await getHorizInterval(zarrDataSet.zarrGroup);
        segmentDurationSec = timeBetweenSamplesSec * samplesCount;
        zoom1DefaultLevels = generateZoomLevelsWithLabels(timeBetweenSamplesSec, segmentDurationSec);
      } catch (infoErr) {
        console.warn('Error deriving info:', infoErr);
      }
      datasetState = { loading: false, ready: true, error: null };
    } catch (e) {
      datasetState = {
        loading: false,
        ready: false,
        error: e instanceof Error ? e.message : String(e),
      };
    }
  });

  function selectData() {
    goto(`${resolve('/selection')}?data=${dataURLParam}&ch=${channelURLParam}&trc=${trcURLParam}&seg=${segmentURLParam}`);
  }
</script>

<svelte:head>
  <title>Data Visualization - ZoomingOnline</title>
  <meta name="description" content="Visualize your dataset with ease" />
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Visualize</h1>
    </div>
    <ShareButton />
  </div>

  {#if !dataURLParam}
    <MissingDataState />
  {:else if datasetState.loading}
    <LoadingState message="Loading dataset information from {dataURLParam}..." />
  {:else if datasetState.error}
    <CannotLoadState {dataURLParam} error={datasetState.error} />
  {:else if datasetState.ready}
    <div class="w-full">
      <div class="flex justify-between items-center mb-4 p-4 bg-white rounded-lg shadow-md">
        <div class="flex-col items-center gap-4">
          <div class="flex items-center gap-2 text-sm text-gray-600">
            <span class="font-semibold text-gray-800">Channel:</span>
            <span class="text-blue-600 font-medium">{channelURLParam} / {channelCount}</span>
            <span class="text-gray-500 mx-1">|</span>
            <span class="font-semibold text-gray-800">TRC:</span>
            <span class="text-blue-600 font-medium">{trcURLParam} / {trcCount}</span>
            <span class="text-gray-500 mx-1">|</span>
            <span class="font-semibold text-gray-800">Segment:</span>
            <span class="text-blue-600 font-medium">{segmentURLParam} / {segmentCount}</span>
            <span class="text-gray-500 mx-1">|</span>
          </div>
          <div class="flex items-center gap-2 text-sm text-gray-600">
            <span class="font-semibold text-gray-800">Samples per segment:</span>
            <span class="text-blue-600 font-medium">{samplesCount}</span>
            <span class="text-gray-500 mx-1">|</span>
            <span class="font-semibold text-gray-800">Time between samples:</span>
            <span class="text-blue-600 font-medium">{timeBetweenSamplesSec}s</span>
            <span class="text-gray-500 mx-1">|</span>
            <span class="font-semibold text-gray-800">Segment duration:</span>
            <span class="text-blue-600 font-medium">{segmentDurationSec}s</span>
          </div>
          <div class="flex items-center gap-2 text-sm text-gray-600">
            <span class="font-semibold text-gray-800">Zoom 1:</span>
            <span class="text-blue-600 font-medium">Level {zoom1LevelParam} @ {zoom1IndexPosParam}</span>
            <span class="text-gray-500 mx-1">|</span>
            <span class="font-semibold text-gray-800">Zoom 2:</span>
            <span class="text-blue-600 font-medium">Level {zoom2LevelParam} @ {zoom2IndexPosParam}</span>
          </div>
          <button class="p-2 bg-emerald-500 text-white font-medium rounded-lg hover:scale-105 w-full md:w-auto max-w-xs" onclick={selectData}>Select Data</button>
          <div class="mt-4">
            {#if Object.keys(zoom1DefaultLevels).length > 0}
              <div class="text-sm text-gray-600">
                <span class="font-semibold text-gray-800">Zoom Levels:</span>
                <div class="flex flex-col gap-2 mt-2">
                  {#each Object.entries(zoom1DefaultLevels) as [level, label]}
                    <span class="text-blue-600 font-medium">Level {level}: value: {label.value} / label: {label.label}</span>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
          <ZoomControls bind:zoomLevel={zoom1LevelParam} timeBetweenPoints={timeBetweenSamplesSec} segmentDuration={segmentDurationSec} />
        </div>
        <ShareButton />
      </div>

      <!-- <Charts {rawStore} {overviewStore} {zarrGroup} channel={validatedParams.channel} trc={validatedParams.trc} segment={validatedParams.segment} /> -->
    </div>
  {/if}
</div>
