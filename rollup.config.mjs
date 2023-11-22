import svelte from 'rollup-plugin-svelte'
import resolve from "@rollup/plugin-node-resolve"
import autoPreprocess from "svelte-preprocess";
import typescript from '@rollup/plugin-typescript';
import css from 'rollup-plugin-css-only'

export default [
    {
        input: "src/logo_generator/index.ts",
        output: {
            file: 'out/assets/logo_generator.js',
            format: 'esm',
            sourcemap:true
        },
        plugins: [
            svelte({
                preprocess: autoPreprocess(),
                emitCss: true,
            }),
            typescript({sourceMap:false}),
            resolve(),
            css({
                output: 'out/assets/logo_generator.css'
            })
        ]
    }
]