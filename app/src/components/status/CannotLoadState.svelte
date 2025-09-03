<script lang="ts">
  import { goto } from '$app/navigation';
  import { resolve } from '$app/paths';
  import { page } from '$app/state';
  import { CircleAlert } from '@lucide/svelte';
  let { dataURLParam, error } = $props();
</script>

<div class="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
      <div class="flex items-center mb-2">
        <div class="w-5 h-5 text-red-600 mr-2">
          <CircleAlert />
        </div>
        <h3 class="text-red-800 font-medium">
          Error Loading Dataset from {dataURLParam}
        </h3>
      </div>
      <p class="text-red-700 mb-4">{error}</p>
      <button class="btn-secondary btn-sm" onclick={() => goto(resolve('/'))}> ← Try Different Dataset </button>
</div>
