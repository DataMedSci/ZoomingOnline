<script lang="ts">
    import { onMount } from 'svelte';
    import { goto } from '$app/navigation';
    import { resolve } from '$app/paths';
    import { page } from '$app/state';
    import { CircleAlert } from '@lucide/svelte';
    import ShareButton from '../../components/ShareButton.svelte';
    import LoadingState from '../../components/LoadingState.svelte';
    import { openZarr, calculateDatasetInfoFrom } from '../../services/dataService';
    import DatasetInfo from '../../components/DatasetInfo.svelte';
    import SelectionForm from '../../components/SelectionForm.svelte';
    import { parseParamInt, stripURLFromHashAndAttributes } from '../../utils/urlParams';
    import MissingDataState from '../../components/MissingDataState.svelte';


    const dataURLParam: string | null = $derived(page.url.searchParams.get('data'));
    const channelURLParam: number = $derived(parseParamInt('ch'));
    const trcURLParam: number = $derived(parseParamInt('trc'));
    const segmentURLParam: number = $derived(parseParamInt('seg'));
    const currentHref: string = $derived(page.url.toString());
    const baseSelectionUrl = $derived(stripURLFromHashAndAttributes(page.url.toString()));

    let datasetState: { loading: boolean; ready: boolean; error: string | null } = $state({
        loading: false,
        ready: false,
        error: null as string | null
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
            <h1 class="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Select Data Parameters
            </h1>
            <p class="text-gray-600">
                Choose the channel, TRC file, and segment to visualize from your dataset.
            </p>
        </div>
        <ShareButton />
    </div>

    {#if !dataURLParam}
        <MissingDataState />
    {:else if datasetState.loading}
        <LoadingState loadingMessage="Loading dataset information..." />
    {:else if datasetState.error}
        <div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div class="flex items-center mb-2">
                <div class="w-5 h-5 text-red-600 mr-2">
                    <CircleAlert />
                </div>
                <h3 class="text-red-800 font-medium">Error Loading Dataset</h3>
            </div>
            <p class="text-red-700 mb-4">{datasetState.error}</p>
            <button class="btn-secondary btn-sm" onclick={() => goto(resolve('/'))}>
                ← Try Different Dataset
            </button>
        </div>
    {:else if datasetState.ready}
        <div class="space-y-6">
            {#if datasetInfo}
                <DatasetInfo datasetInfo={datasetInfo} datasetUrl={dataURLParam} />
            {:else}
                <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p class="text-yellow-800">Loading dataset information...</p>
                </div>
            {/if}

            <div class="bg-white rounded-lg shadow-md p-6">
                <h2 class="text-xl font-semibold text-gray-900 mb-4">Selection Parameters</h2>
                <!-- Channel: {channelURLParam}, TRC: {trcURLParam}, Segment: {segmentURLParam}
                Count: Channels: {channelCount}, TRCs: {trcCount}, Segments: {segmentCount} -->

                <SelectionForm 
                    noOfChannels={channelCount}
                    noOfTrcFiles={trcCount}
                    noOfSegments={segmentCount}
                    defaultChannel={channelURLParam}
                    defaultTrc={trcURLParam}
                    defaultSegment={segmentURLParam}
                    dataURLParam={dataURLParam}
                />
            </div>
        </div>
    {/if}
</div>

<style>
    .container {
        animation: fadeIn 0.3s ease-in-out;
    }
    
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
</style>