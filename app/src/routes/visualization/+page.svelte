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
  import { generateZoomLevelsWithLabels } from '../../components/chart/zoomLevels';
  import ZoomControls from '../../components/chart/ZoomControls.svelte';
  import Visualisation from '../../components/Visualisation.svelte';

  const defaultFirstZoomFractionPos: number = 0.5;
  const defaultSecondZoomFractionPos: number = 0.5;

  const dataURLParam: string | null = $derived(page.url.searchParams.get('data'));
  const channelIndex: number = $derived(parseParamInt('ch'));
  const trcIndex: number = $derived(parseParamInt('trc'));
  const segmentIndex: number = $derived(parseParamInt('seg'));

  let zoom1Level: number = $derived(parseParamInt('z1level', -1));
  let zoom1IndexPos: number = $derived(parseParamInt('z1pos', -1));
  let zoom2Level: number = $derived(parseParamInt('z2level', -1));
  let zoom2IndexPos: number = $derived(parseParamInt('z2pos', -1));

  let datasetState: {
    loading: boolean;
    ready: boolean;
    error: string | null;
  } = $state({
    loading: false,
    ready: false,
    error: null as string | null,
  });

  let zoom1DefaultLevels = $state(Array<{ value: number; label: string }>());
  let zoom2DefaultLevels = $state(Array<{ value: number; label: string }>());
  let timeBetweenSamplesSec: number = $state(0);
  let segmentDurationSec: number = $state(0);
  let defaultZoom1Level: number = $state(-1);
  let defaultZoom2Level: number = $state(-1);

  onMount(async () => {
    if (!dataURLParam) return;

    datasetState = { loading: true, ready: false, error: null };
    try {
      const zarrDataSet = await openZarr(dataURLParam);
      try {
        const [channelCount, trcCount, segmentCount, samplesCount] = await zarrDataSet.rawStore.shape;
        // derive default zoom positions if not explicitly set
        zoom1IndexPos = zoom1IndexPos === -1 ? Math.floor(defaultFirstZoomFractionPos * samplesCount) : zoom1IndexPos;
        zoom2IndexPos = zoom2IndexPos === -1 ? Math.floor(defaultSecondZoomFractionPos * samplesCount) : zoom2IndexPos;

        timeBetweenSamplesSec = await getHorizInterval(zarrDataSet.zarrGroup);
        segmentDurationSec = timeBetweenSamplesSec * samplesCount;
        zoom1DefaultLevels = generateZoomLevelsWithLabels(timeBetweenSamplesSec, segmentDurationSec);
        defaultZoom1Level = Math.max(0, zoom1DefaultLevels.length - 3);
        zoom1Level = zoom1Level === -1 ? defaultZoom1Level : zoom1Level;
        zoom2DefaultLevels = generateZoomLevelsWithLabels(timeBetweenSamplesSec, zoom1DefaultLevels.at(zoom1Level)?.value || segmentDurationSec);
        defaultZoom2Level = Math.max(0, zoom2DefaultLevels.length - 3);
        zoom2Level = zoom2Level === -1 ? defaultZoom2Level : zoom2Level;
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

  // function selectData() {
  //   goto(`${resolve('/selection')}?data=${dataURLParam}&ch=${channelIndex}&trc=${trcIndex}&seg=${segmentIndex}`);
  // }
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
    <Visualisation
      {dataURLParam}
      {channelIndex}
      {trcIndex}
      {segmentIndex}
      defaultZoom1Level={zoom1Level}
      defaultZoom2Level={zoom2Level}
      defaultZoom1IndexPos={zoom1IndexPos}
      defaultZoom2IndexPos={zoom2IndexPos}
    />
  {/if}
</div>
