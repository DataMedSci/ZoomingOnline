<script lang="ts">   
    import Header from '../components/Header.svelte';
    import ErrorBoundary from '../components/ErrorBoundary.svelte';
    import '../app.css';
    import type { Snippet } from 'svelte';

    // Children snippet for layout using Svelte 5 pattern
    const { 
        children 
    }: {
        children: Snippet;
    } = $props();
    
    function handleLayoutError(error: Error): void {
        console.error('Layout error:', error);
    }

</script>

<ErrorBoundary 
    context="Application Layout"
    onError={handleLayoutError}
>
    <main class="w-full max-w-6xl mx-auto px-4">
        <Header />
        {@render children()}
    </main>
</ErrorBoundary>

<style>
    /* Full width for visualization route */
    :global(.visualization-page) main {
        max-width: 95%;
        width: 95%;
    }
</style>