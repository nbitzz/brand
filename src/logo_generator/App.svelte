<script lang="ts">
    import Logo from "./elements/Logo.svelte"

    let logo: Logo

    let strips: [string[], string[], string[]] = [
        ["#FB405A", "#7A2259"],
        ["#7A2259", "#FB405A"],
        ["#FB405A", "#7A2259"]
    ]
    /*
    let strips: [string[], string[], string[]] = [
        ["#5BCEFA", "#F5A9B8", "#FFFFFF", "#F5A9B8", "#5BCEFA"],
        ["#E50000", "#FF8D00", "#FFEE00", "#028121", "#004CFF", "#770088" ],
        // ["#2D2D2D", "#9B59D0", "#FFFFFF", "#FFF433"] enby
        ["#A30262", "#D362A4", "#FFFFFF", "#FF9A56", "#D52D00"]
    ]
    */
</script>

<div id="main">
    <div id="svgcontain">
        <Logo bind:this={logo} bind:strips/>
    </div>

    <div id="stripBuilder">
        {#each strips as strip}
            <div class="strip">
                {#each strip.keys() as index}
                    <!-- too lazy to attempt fixing so you get -->
                    {#if index == strip.length-1}
                        <button on:click={() => {strip.splice(strip.length-1,0,"#FFFFFF"); strips = strips}}>+</button>
                    {/if}

                    <div class="item">
                        <input type="color" bind:value={strip[index]}>
                        {#if index != strip.length-1 && index != 0}
                            <button on:click={() => {strip.splice(index,1); strips = strips}}>X</button>
                        {/if}
                    </div>
                {/each}
            </div>
        {/each}
    </div>
</div>