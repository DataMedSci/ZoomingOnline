<script lang="ts">
    const { 
        loadingMessage = 'Loading data...',
    }: {
        loadingMessage?: string;
    } = $props();
</script>

<div class="flex flex-col items-center justify-center py-16 px-8 text-center">
    <div class="animate-spin w-10 h-10 border-4 border-gray-200 border-t-blue-500 rounded-full mb-4"></div>
    <p class="text-gray-600">{loadingMessage}</p>
</div>
