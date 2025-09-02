<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { CircleAlert } from '@lucide/svelte';
  import { stripURLFromHashAndAttributes } from '../../lib/urlParams';

  const currentURL: string = $derived(page.url.toString());
  const baseSelectionUrl = $derived(stripURLFromHashAndAttributes(page.url.toString()));
</script>

<div class="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
  <div class="flex items-center mb-2">
    <div class="w-5 h-5 text-yellow-600 mr-2">
      <CircleAlert />
    </div>
    <h3 class="text-yellow-800 font-medium">Missing dataset</h3>
  </div>
  <p class="text-yellow-700 mb-2">
    No <code>data</code> query parameter was provided in the URL.
  </p>
  <p class="text-sm text-gray-600 mb-2">Current URL: {currentURL}</p>
  <p class="text-sm text-gray-600 mb-2">
    Expected: <code>{baseSelectionUrl}?data=&lt;URL-to-zarr&gt;</code>
  </p>
  <p class="text-sm text-gray-600 mb-4">
    for example <code>{baseSelectionUrl}?data=https://example.com/path/to/example.zarr</code>
  </p>
  <button class="btn-secondary btn-sm" onclick={() => goto(resolve('/'))}> ← Enter dataset URL </button>
</div>
