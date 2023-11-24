<!--
    An SVG denoting a logo for split's stuff 
-->

<script lang="ts">

    export let strips: [string[], string[], string[]]

</script>

<svg width="512" height="512" viewBox="0 0 512 512"> 
    <!-- Dynamically modified by Svelte :) -->
    <defs>
        {#each strips.entries() as [stripNumber, strip]} 
            <linearGradient id={ "strip" + stripNumber.toString() } gradientTransform="rotate(-45) translate(-0.5)">
                {#each strip.entries() as [index, stop]}
                    <stop offset={index/(strip.length-1)} stop-color={stop} />
                {/each}
            </linearGradient>
        {/each}
    </defs>

    <!-- Actual icon stuffs! :3 -->

    <rect width="512" height="512" fill="#2a2a2a" />
    <line 
        stroke="url(#strip0)" 
        x1="181" 
        x2="331" 
        y1="331" 
        y2="181" 
        stroke-width="15" 
        stroke-linecap="round"
        transform="translate(-25,-25)"
    />
    <line 
        stroke="url(#strip1)" 
        x1="161" 
        x2="351" 
        y1="351" 
        y2="161" 
        stroke-width="15" 
        stroke-linecap="round" 
    /> 
    <line 
        stroke="url(#strip2)" 
        x1="181" 
        x2="331" 
        y1="331" 
        y2="181" 
        stroke-width="15" 
        stroke-linecap="round"
        transform="translate(25,25)"
    />
</svg>