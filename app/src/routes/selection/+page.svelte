<script lang="ts">
  import { onMount } from 'svelte';
  import { page } from '$app/state';
  import { parseParamInt } from '$lib/urlParams';
  import { openZarr, calculateDatasetInfoFrom } from '$lib/dataService';
  import DatasetInfo from '../../components/DatasetInfo.svelte';
  import ShareButton from '../../components/ShareButton.svelte';
  import CannotLoadState from '../../components/status/CannotLoadState.svelte';
  import LoadingState from '../../components/status/LoadingState.svelte';
  import MissingDataState from '../../components/status/MissingDataState.svelte';
  import SelectionForm from '../../components/SelectionForm.svelte';

  const dataURLParam: string | null = $derived(page.url.searchParams.get('data'));
  const channelURLParam: number = $derived(parseParamInt('ch'));
  const trcURLParam: number = $derived(parseParamInt('trc'));
  const segmentURLParam: number = $derived(parseParamInt('seg'));

  let datasetState: {
    loading: boolean;
    ready: boolean;
    error: string | null;
  } = $state({
    loading: false,
    ready: false,
    error: null as string | null,
  });

  let datasetInfo: any = $state(null);
  let channelCount: number = $state(0);
  let trcCount: number = $state(0);
  let segmentCount: number = $state(0);

  onMount(async () => {
    if (!dataURLParam) return;

    datasetState = { loading: true, ready: false, error: null };
    try {
      const zarrDataSet = await openZarr(dataURLParam);
      try {
        datasetInfo = await calculateDatasetInfoFrom(zarrDataSet.rawStore, zarrDataSet.overviewStore, zarrDataSet.zarrGroup);
        [channelCount, trcCount, segmentCount] = await zarrDataSet.rawStore.shape;
      } catch (infoErr) {
        datasetInfo = null;
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
</script>

<svelte:head>
  <title>Data Selection - ZoomingOnline</title>
  <meta name="description" content="Select channel, TRC, and segment for data visualization" />
</svelte:head>

<div class="container mx-auto px-4 py-8 max-w-4xl">
  <div class="flex items-center justify-between mb-8">
    <div>
      <h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2">Select Data Parameters</h1>
      <p class="text-gray-600">Choose the channel, TRC file, and segment to visualize from your dataset.</p>
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
    <div class="space-y-6">
      {#if datasetInfo}
        <DatasetInfo {datasetInfo} datasetUrl={dataURLParam} />
      {:else}
        <LoadingState message="Loading dataset information from {dataURLParam}..." />
      {/if}

      <SelectionForm
        noOfChannels={channelCount}
        noOfTrcFiles={trcCount}
        noOfSegments={segmentCount}
        defaultChannel={channelURLParam}
        defaultTrc={trcURLParam}
        defaultSegment={segmentURLParam}
        {dataURLParam}
      />
    </div>
  {/if}
</div>
