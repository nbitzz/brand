<script lang="ts">
    import Logo from "./elements/Logo.svelte"

    let logo: Logo
    /*
    let strips: [string[], string[], string[]] = [
        ["#FB405A", "#7A2259"],
        ["#7A2259", "#FB405A"],
        ["#FB405A", "#7A2259"]
    ]*/
    let strips: [string[], string[], string[]] = [
        ["#5BCEFA", "#F5A9B8", "#FFFFFF", "#F5A9B8", "#5BCEFA"],
        ["#770088", "#004CFF", "#028121", "#FFEE00", "#FF8D00", "#E50000"],
        ["#2D2D2D", "#9B59D0", "#FFFFFF", "#FFF433"]
    ]
</script>

<div id="main">
    <Logo bind:this={logo} bind:strips/>

    <div id="stripBuilder">
        {#each strips as strip}
            <div class="strip">
                <div class="item"><input type="color" bind:value={strip[0]}></div>
                <!-- stupid but who gives a fuck -->
                {#each Array.from(strip.keys()).slice(1,-1) as index}
                    <div class="item">
                        <input type="color" bind:value={strip[index]}>
                        <button on:click={() => {strip.splice(index,1); strips = strips}}>X</button>
                    </div>
                {/each}
                <button on:click={() => {strip.splice(strip.length-1,0,"#FFFFFF"); strips = strips}}>+</button>
                <div class="item"><input type="color" bind:value={strip[strip.length-1]}></div>
            </div>
        {/each}
    </div>
</div>