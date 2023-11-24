/** @returns {void} */
function noop() {}

function run(fn) {
	return fn();
}

function blank_object() {
	return Object.create(null);
}

/**
 * @param {Function[]} fns
 * @returns {void}
 */
function run_all(fns) {
	fns.forEach(run);
}

/**
 * @param {any} thing
 * @returns {thing is Function}
 */
function is_function(thing) {
	return typeof thing === 'function';
}

/** @returns {boolean} */
function safe_not_equal(a, b) {
	return a != a ? b == b : a !== b || (a && typeof a === 'object') || typeof a === 'function';
}

/** @returns {boolean} */
function is_empty(obj) {
	return Object.keys(obj).length === 0;
}

/**
 * @param {Node} target
 * @param {Node} node
 * @returns {void}
 */
function append(target, node) {
	target.appendChild(node);
}

/**
 * @param {Node} target
 * @param {Node} node
 * @param {Node} [anchor]
 * @returns {void}
 */
function insert(target, node, anchor) {
	target.insertBefore(node, anchor || null);
}

/**
 * @param {Node} node
 * @returns {void}
 */
function detach(node) {
	if (node.parentNode) {
		node.parentNode.removeChild(node);
	}
}

/**
 * @returns {void} */
function destroy_each(iterations, detaching) {
	for (let i = 0; i < iterations.length; i += 1) {
		if (iterations[i]) iterations[i].d(detaching);
	}
}

/**
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} name
 * @returns {HTMLElementTagNameMap[K]}
 */
function element(name) {
	return document.createElement(name);
}

/**
 * @template {keyof SVGElementTagNameMap} K
 * @param {K} name
 * @returns {SVGElement}
 */
function svg_element(name) {
	return document.createElementNS('http://www.w3.org/2000/svg', name);
}

/**
 * @param {string} data
 * @returns {Text}
 */
function text(data) {
	return document.createTextNode(data);
}

/**
 * @returns {Text} */
function space() {
	return text(' ');
}

/**
 * @param {EventTarget} node
 * @param {string} event
 * @param {EventListenerOrEventListenerObject} handler
 * @param {boolean | AddEventListenerOptions | EventListenerOptions} [options]
 * @returns {() => void}
 */
function listen(node, event, handler, options) {
	node.addEventListener(event, handler, options);
	return () => node.removeEventListener(event, handler, options);
}

/**
 * @param {Element} node
 * @param {string} attribute
 * @param {string} [value]
 * @returns {void}
 */
function attr(node, attribute, value) {
	if (value == null) node.removeAttribute(attribute);
	else if (node.getAttribute(attribute) !== value) node.setAttribute(attribute, value);
}

/**
 * @param {Element} element
 * @returns {ChildNode[]}
 */
function children(element) {
	return Array.from(element.childNodes);
}

/**
 * @returns {void} */
function set_input_value(input, value) {
	input.value = value == null ? '' : value;
}

/**
 * @typedef {Node & {
 * 	claim_order?: number;
 * 	hydrate_init?: true;
 * 	actual_end_child?: NodeEx;
 * 	childNodes: NodeListOf<NodeEx>;
 * }} NodeEx
 */

/** @typedef {ChildNode & NodeEx} ChildNodeEx */

/** @typedef {NodeEx & { claim_order: number }} NodeEx2 */

/**
 * @typedef {ChildNodeEx[] & {
 * 	claim_info?: {
 * 		last_index: number;
 * 		total_claimed: number;
 * 	};
 * }} ChildNodeArray
 */

let current_component;

/** @returns {void} */
function set_current_component(component) {
	current_component = component;
}

const dirty_components = [];
const binding_callbacks = [];

let render_callbacks = [];

const flush_callbacks = [];

const resolved_promise = /* @__PURE__ */ Promise.resolve();

let update_scheduled = false;

/** @returns {void} */
function schedule_update() {
	if (!update_scheduled) {
		update_scheduled = true;
		resolved_promise.then(flush);
	}
}

/** @returns {void} */
function add_render_callback(fn) {
	render_callbacks.push(fn);
}

/** @returns {void} */
function add_flush_callback(fn) {
	flush_callbacks.push(fn);
}

// flush() calls callbacks in this order:
// 1. All beforeUpdate callbacks, in order: parents before children
// 2. All bind:this callbacks, in reverse order: children before parents.
// 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
//    for afterUpdates called during the initial onMount, which are called in
//    reverse order: children before parents.
// Since callbacks might update component values, which could trigger another
// call to flush(), the following steps guard against this:
// 1. During beforeUpdate, any updated components will be added to the
//    dirty_components array and will cause a reentrant call to flush(). Because
//    the flush index is kept outside the function, the reentrant call will pick
//    up where the earlier call left off and go through all dirty components. The
//    current_component value is saved and restored so that the reentrant call will
//    not interfere with the "parent" flush() call.
// 2. bind:this callbacks cannot trigger new flush() calls.
// 3. During afterUpdate, any updated components will NOT have their afterUpdate
//    callback called a second time; the seen_callbacks set, outside the flush()
//    function, guarantees this behavior.
const seen_callbacks = new Set();

let flushidx = 0; // Do *not* move this inside the flush() function

/** @returns {void} */
function flush() {
	// Do not reenter flush while dirty components are updated, as this can
	// result in an infinite loop. Instead, let the inner flush handle it.
	// Reentrancy is ok afterwards for bindings etc.
	if (flushidx !== 0) {
		return;
	}
	const saved_component = current_component;
	do {
		// first, call beforeUpdate functions
		// and update components
		try {
			while (flushidx < dirty_components.length) {
				const component = dirty_components[flushidx];
				flushidx++;
				set_current_component(component);
				update(component.$$);
			}
		} catch (e) {
			// reset dirty state to not end up in a deadlocked state and then rethrow
			dirty_components.length = 0;
			flushidx = 0;
			throw e;
		}
		set_current_component(null);
		dirty_components.length = 0;
		flushidx = 0;
		while (binding_callbacks.length) binding_callbacks.pop()();
		// then, once components are updated, call
		// afterUpdate functions. This may cause
		// subsequent updates...
		for (let i = 0; i < render_callbacks.length; i += 1) {
			const callback = render_callbacks[i];
			if (!seen_callbacks.has(callback)) {
				// ...so guard against infinite loops
				seen_callbacks.add(callback);
				callback();
			}
		}
		render_callbacks.length = 0;
	} while (dirty_components.length);
	while (flush_callbacks.length) {
		flush_callbacks.pop()();
	}
	update_scheduled = false;
	seen_callbacks.clear();
	set_current_component(saved_component);
}

/** @returns {void} */
function update($$) {
	if ($$.fragment !== null) {
		$$.update();
		run_all($$.before_update);
		const dirty = $$.dirty;
		$$.dirty = [-1];
		$$.fragment && $$.fragment.p($$.ctx, dirty);
		$$.after_update.forEach(add_render_callback);
	}
}

/**
 * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
 * @param {Function[]} fns
 * @returns {void}
 */
function flush_render_callbacks(fns) {
	const filtered = [];
	const targets = [];
	render_callbacks.forEach((c) => (fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c)));
	targets.forEach((c) => c());
	render_callbacks = filtered;
}

const outroing = new Set();

/**
 * @type {Outro}
 */
let outros;

/**
 * @param {import('./private.js').Fragment} block
 * @param {0 | 1} [local]
 * @returns {void}
 */
function transition_in(block, local) {
	if (block && block.i) {
		outroing.delete(block);
		block.i(local);
	}
}

/**
 * @param {import('./private.js').Fragment} block
 * @param {0 | 1} local
 * @param {0 | 1} [detach]
 * @param {() => void} [callback]
 * @returns {void}
 */
function transition_out(block, local, detach, callback) {
	if (block && block.o) {
		if (outroing.has(block)) return;
		outroing.add(block);
		outros.c.push(() => {
			outroing.delete(block);
			if (callback) {
				if (detach) block.d(1);
				callback();
			}
		});
		block.o(local);
	} else if (callback) {
		callback();
	}
}

/** @typedef {1} INTRO */
/** @typedef {0} OUTRO */
/** @typedef {{ direction: 'in' | 'out' | 'both' }} TransitionOptions */
/** @typedef {(node: Element, params: any, options: TransitionOptions) => import('../transition/public.js').TransitionConfig} TransitionFn */

/**
 * @typedef {Object} Outro
 * @property {number} r
 * @property {Function[]} c
 * @property {Object} p
 */

/**
 * @typedef {Object} PendingProgram
 * @property {number} start
 * @property {INTRO|OUTRO} b
 * @property {Outro} [group]
 */

/**
 * @typedef {Object} Program
 * @property {number} a
 * @property {INTRO|OUTRO} b
 * @property {1|-1} d
 * @property {number} duration
 * @property {number} start
 * @property {number} end
 * @property {Outro} [group]
 */

// general each functions:

function ensure_array_like(array_like_or_iterator) {
	return array_like_or_iterator?.length !== undefined
		? array_like_or_iterator
		: Array.from(array_like_or_iterator);
}

/** @returns {void} */
function bind(component, name, callback) {
	const index = component.$$.props[name];
	if (index !== undefined) {
		component.$$.bound[index] = callback;
		callback(component.$$.ctx[index]);
	}
}

/** @returns {void} */
function create_component(block) {
	block && block.c();
}

/** @returns {void} */
function mount_component(component, target, anchor) {
	const { fragment, after_update } = component.$$;
	fragment && fragment.m(target, anchor);
	// onMount happens before the initial afterUpdate
	add_render_callback(() => {
		const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
		// if the component was destroyed immediately
		// it will update the `$$.on_destroy` reference to `null`.
		// the destructured on_destroy may still reference to the old array
		if (component.$$.on_destroy) {
			component.$$.on_destroy.push(...new_on_destroy);
		} else {
			// Edge case - component was destroyed immediately,
			// most likely as a result of a binding initialising
			run_all(new_on_destroy);
		}
		component.$$.on_mount = [];
	});
	after_update.forEach(add_render_callback);
}

/** @returns {void} */
function destroy_component(component, detaching) {
	const $$ = component.$$;
	if ($$.fragment !== null) {
		flush_render_callbacks($$.after_update);
		run_all($$.on_destroy);
		$$.fragment && $$.fragment.d(detaching);
		// TODO null out other refs, including component.$$ (but need to
		// preserve final state?)
		$$.on_destroy = $$.fragment = null;
		$$.ctx = [];
	}
}

/** @returns {void} */
function make_dirty(component, i) {
	if (component.$$.dirty[0] === -1) {
		dirty_components.push(component);
		schedule_update();
		component.$$.dirty.fill(0);
	}
	component.$$.dirty[(i / 31) | 0] |= 1 << i % 31;
}

// TODO: Document the other params
/**
 * @param {SvelteComponent} component
 * @param {import('./public.js').ComponentConstructorOptions} options
 *
 * @param {import('./utils.js')['not_equal']} not_equal Used to compare props and state values.
 * @param {(target: Element | ShadowRoot) => void} [append_styles] Function that appends styles to the DOM when the component is first initialised.
 * This will be the `add_css` function from the compiled component.
 *
 * @returns {void}
 */
function init(
	component,
	options,
	instance,
	create_fragment,
	not_equal,
	props,
	append_styles = null,
	dirty = [-1]
) {
	const parent_component = current_component;
	set_current_component(component);
	/** @type {import('./private.js').T$$} */
	const $$ = (component.$$ = {
		fragment: null,
		ctx: [],
		// state
		props,
		update: noop,
		not_equal,
		bound: blank_object(),
		// lifecycle
		on_mount: [],
		on_destroy: [],
		on_disconnect: [],
		before_update: [],
		after_update: [],
		context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
		// everything else
		callbacks: blank_object(),
		dirty,
		skip_bound: false,
		root: options.target || parent_component.$$.root
	});
	append_styles && append_styles($$.root);
	let ready = false;
	$$.ctx = instance
		? instance(component, options.props || {}, (i, ret, ...rest) => {
				const value = rest.length ? rest[0] : ret;
				if ($$.ctx && not_equal($$.ctx[i], ($$.ctx[i] = value))) {
					if (!$$.skip_bound && $$.bound[i]) $$.bound[i](value);
					if (ready) make_dirty(component, i);
				}
				return ret;
		  })
		: [];
	$$.update();
	ready = true;
	run_all($$.before_update);
	// `false` as a special case of no DOM component
	$$.fragment = create_fragment ? create_fragment($$.ctx) : false;
	if (options.target) {
		if (options.hydrate) {
			// TODO: what is the correct type here?
			// @ts-expect-error
			const nodes = children(options.target);
			$$.fragment && $$.fragment.l(nodes);
			nodes.forEach(detach);
		} else {
			// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
			$$.fragment && $$.fragment.c();
		}
		if (options.intro) transition_in(component.$$.fragment);
		mount_component(component, options.target, options.anchor);
		flush();
	}
	set_current_component(parent_component);
}

/**
 * Base class for Svelte components. Used when dev=false.
 *
 * @template {Record<string, any>} [Props=any]
 * @template {Record<string, any>} [Events=any]
 */
class SvelteComponent {
	/**
	 * ### PRIVATE API
	 *
	 * Do not use, may change at any time
	 *
	 * @type {any}
	 */
	$$ = undefined;
	/**
	 * ### PRIVATE API
	 *
	 * Do not use, may change at any time
	 *
	 * @type {any}
	 */
	$$set = undefined;

	/** @returns {void} */
	$destroy() {
		destroy_component(this, 1);
		this.$destroy = noop;
	}

	/**
	 * @template {Extract<keyof Events, string>} K
	 * @param {K} type
	 * @param {((e: Events[K]) => void) | null | undefined} callback
	 * @returns {() => void}
	 */
	$on(type, callback) {
		if (!is_function(callback)) {
			return noop;
		}
		const callbacks = this.$$.callbacks[type] || (this.$$.callbacks[type] = []);
		callbacks.push(callback);
		return () => {
			const index = callbacks.indexOf(callback);
			if (index !== -1) callbacks.splice(index, 1);
		};
	}

	/**
	 * @param {Partial<Props>} props
	 * @returns {void}
	 */
	$set(props) {
		if (this.$$set && !is_empty(props)) {
			this.$$.skip_bound = true;
			this.$$set(props);
			this.$$.skip_bound = false;
		}
	}
}

/**
 * @typedef {Object} CustomElementPropDefinition
 * @property {string} [attribute]
 * @property {boolean} [reflect]
 * @property {'String'|'Boolean'|'Number'|'Array'|'Object'} [type]
 */

// generated during release, do not modify

const PUBLIC_VERSION = '4';

if (typeof window !== 'undefined')
	// @ts-ignore
	(window.__svelte || (window.__svelte = { v: new Set() })).v.add(PUBLIC_VERSION);

/* src/logo_generator/elements/Logo.svelte generated by Svelte v4.2.7 */

function get_each_context$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[1] = list[i][0];
	child_ctx[2] = list[i][1];
	return child_ctx;
}

function get_each_context_1$1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[5] = list[i][0];
	child_ctx[6] = list[i][1];
	return child_ctx;
}

// (13:16) {#each strip.entries() as [index, stop]}
function create_each_block_1$1(ctx) {
	let stop_1;
	let stop_1_offset_value;
	let stop_1_stop_color_value;

	return {
		c() {
			stop_1 = svg_element("stop");
			attr(stop_1, "offset", stop_1_offset_value = /*index*/ ctx[5] / (/*strip*/ ctx[2].length - 1));
			attr(stop_1, "stop-color", stop_1_stop_color_value = /*stop*/ ctx[6]);
		},
		m(target, anchor) {
			insert(target, stop_1, anchor);
		},
		p(ctx, dirty) {
			if (dirty & /*strips*/ 1 && stop_1_offset_value !== (stop_1_offset_value = /*index*/ ctx[5] / (/*strip*/ ctx[2].length - 1))) {
				attr(stop_1, "offset", stop_1_offset_value);
			}

			if (dirty & /*strips*/ 1 && stop_1_stop_color_value !== (stop_1_stop_color_value = /*stop*/ ctx[6])) {
				attr(stop_1, "stop-color", stop_1_stop_color_value);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(stop_1);
			}
		}
	};
}

// (11:8) {#each strips.entries() as [stripNumber, strip]}
function create_each_block$1(ctx) {
	let linearGradient;
	let linearGradient_id_value;
	let each_value_1 = ensure_array_like(/*strip*/ ctx[2].entries());
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
	}

	return {
		c() {
			linearGradient = svg_element("linearGradient");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(linearGradient, "id", linearGradient_id_value = "strip" + /*stripNumber*/ ctx[1].toString());
			attr(linearGradient, "gradientTransform", "rotate(-45) translate(-0.5)");
		},
		m(target, anchor) {
			insert(target, linearGradient, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(linearGradient, null);
				}
			}
		},
		p(ctx, dirty) {
			if (dirty & /*strips*/ 1) {
				each_value_1 = ensure_array_like(/*strip*/ ctx[2].entries());
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_1$1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(linearGradient, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_1.length;
			}

			if (dirty & /*strips*/ 1 && linearGradient_id_value !== (linearGradient_id_value = "strip" + /*stripNumber*/ ctx[1].toString())) {
				attr(linearGradient, "id", linearGradient_id_value);
			}
		},
		d(detaching) {
			if (detaching) {
				detach(linearGradient);
			}

			destroy_each(each_blocks, detaching);
		}
	};
}

function create_fragment$1(ctx) {
	let svg;
	let defs;
	let rect;
	let line0;
	let line1;
	let line2;
	let each_value = ensure_array_like(/*strips*/ ctx[0].entries());
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
	}

	return {
		c() {
			svg = svg_element("svg");
			defs = svg_element("defs");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			rect = svg_element("rect");
			line0 = svg_element("line");
			line1 = svg_element("line");
			line2 = svg_element("line");
			attr(rect, "width", "512");
			attr(rect, "height", "512");
			attr(rect, "fill", "#2a2a2a");
			attr(line0, "stroke", "url(#strip0)");
			attr(line0, "x1", "181");
			attr(line0, "x2", "331");
			attr(line0, "y1", "331");
			attr(line0, "y2", "181");
			attr(line0, "stroke-width", "15");
			attr(line0, "stroke-linecap", "round");
			attr(line0, "transform", "translate(-25,-25)");
			attr(line1, "stroke", "url(#strip1)");
			attr(line1, "x1", "161");
			attr(line1, "x2", "351");
			attr(line1, "y1", "351");
			attr(line1, "y2", "161");
			attr(line1, "stroke-width", "15");
			attr(line1, "stroke-linecap", "round");
			attr(line2, "stroke", "url(#strip2)");
			attr(line2, "x1", "181");
			attr(line2, "x2", "331");
			attr(line2, "y1", "331");
			attr(line2, "y2", "181");
			attr(line2, "stroke-width", "15");
			attr(line2, "stroke-linecap", "round");
			attr(line2, "transform", "translate(25,25)");
			attr(svg, "width", "512");
			attr(svg, "height", "512");
			attr(svg, "viewBox", "0 0 512 512");
		},
		m(target, anchor) {
			insert(target, svg, anchor);
			append(svg, defs);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(defs, null);
				}
			}

			append(svg, rect);
			append(svg, line0);
			append(svg, line1);
			append(svg, line2);
		},
		p(ctx, [dirty]) {
			if (dirty & /*strips*/ 1) {
				each_value = ensure_array_like(/*strips*/ ctx[0].entries());
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context$1(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block$1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(defs, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		i: noop,
		o: noop,
		d(detaching) {
			if (detaching) {
				detach(svg);
			}

			destroy_each(each_blocks, detaching);
		}
	};
}

function instance$1($$self, $$props, $$invalidate) {
	let { strips } = $$props;

	$$self.$$set = $$props => {
		if ('strips' in $$props) $$invalidate(0, strips = $$props.strips);
	};

	return [strips];
}

class Logo extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance$1, create_fragment$1, safe_not_equal, { strips: 0 });
	}
}

/* src/logo_generator/App.svelte generated by Svelte v4.2.7 */

function get_each_context(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[7] = list[i];
	child_ctx[8] = list;
	child_ctx[9] = i;
	return child_ctx;
}

function get_each_context_1(ctx, list, i) {
	const child_ctx = ctx.slice();
	child_ctx[10] = list[i];
	child_ctx[11] = list;
	child_ctx[12] = i;
	return child_ctx;
}

// (28:20) {#if index == strip.length-1}
function create_if_block_1(ctx) {
	let button;
	let mounted;
	let dispose;

	function click_handler() {
		return /*click_handler*/ ctx[4](/*strip*/ ctx[7]);
	}

	return {
		c() {
			button = element("button");
			button.textContent = "+";
		},
		m(target, anchor) {
			insert(target, button, anchor);

			if (!mounted) {
				dispose = listen(button, "click", click_handler);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
		},
		d(detaching) {
			if (detaching) {
				detach(button);
			}

			mounted = false;
			dispose();
		}
	};
}

// (34:24) {#if index != strip.length-1 && index != 0}
function create_if_block(ctx) {
	let button;
	let mounted;
	let dispose;

	function click_handler_1() {
		return /*click_handler_1*/ ctx[6](/*strip*/ ctx[7], /*index*/ ctx[10]);
	}

	return {
		c() {
			button = element("button");
			button.textContent = "X";
		},
		m(target, anchor) {
			insert(target, button, anchor);

			if (!mounted) {
				dispose = listen(button, "click", click_handler_1);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;
		},
		d(detaching) {
			if (detaching) {
				detach(button);
			}

			mounted = false;
			dispose();
		}
	};
}

// (26:16) {#each strip.keys() as index}
function create_each_block_1(ctx) {
	let t0;
	let div;
	let input;
	let t1;
	let mounted;
	let dispose;
	let if_block0 = /*index*/ ctx[10] == /*strip*/ ctx[7].length - 1 && create_if_block_1(ctx);

	function input_input_handler() {
		/*input_input_handler*/ ctx[5].call(input, /*index*/ ctx[10], /*each_value*/ ctx[8], /*strip_index*/ ctx[9]);
	}

	let if_block1 = /*index*/ ctx[10] != /*strip*/ ctx[7].length - 1 && /*index*/ ctx[10] != 0 && create_if_block(ctx);

	return {
		c() {
			if (if_block0) if_block0.c();
			t0 = space();
			div = element("div");
			input = element("input");
			t1 = space();
			if (if_block1) if_block1.c();
			attr(input, "type", "color");
			attr(div, "class", "item");
		},
		m(target, anchor) {
			if (if_block0) if_block0.m(target, anchor);
			insert(target, t0, anchor);
			insert(target, div, anchor);
			append(div, input);
			set_input_value(input, /*strip*/ ctx[7][/*index*/ ctx[10]]);
			append(div, t1);
			if (if_block1) if_block1.m(div, null);

			if (!mounted) {
				dispose = listen(input, "input", input_input_handler);
				mounted = true;
			}
		},
		p(new_ctx, dirty) {
			ctx = new_ctx;

			if (/*index*/ ctx[10] == /*strip*/ ctx[7].length - 1) {
				if (if_block0) {
					if_block0.p(ctx, dirty);
				} else {
					if_block0 = create_if_block_1(ctx);
					if_block0.c();
					if_block0.m(t0.parentNode, t0);
				}
			} else if (if_block0) {
				if_block0.d(1);
				if_block0 = null;
			}

			if (dirty & /*strips*/ 2) {
				set_input_value(input, /*strip*/ ctx[7][/*index*/ ctx[10]]);
			}

			if (/*index*/ ctx[10] != /*strip*/ ctx[7].length - 1 && /*index*/ ctx[10] != 0) {
				if (if_block1) {
					if_block1.p(ctx, dirty);
				} else {
					if_block1 = create_if_block(ctx);
					if_block1.c();
					if_block1.m(div, null);
				}
			} else if (if_block1) {
				if_block1.d(1);
				if_block1 = null;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(t0);
				detach(div);
			}

			if (if_block0) if_block0.d(detaching);
			if (if_block1) if_block1.d();
			mounted = false;
			dispose();
		}
	};
}

// (24:8) {#each strips as strip}
function create_each_block(ctx) {
	let div;
	let t;
	let each_value_1 = ensure_array_like(/*strip*/ ctx[7].keys());
	let each_blocks = [];

	for (let i = 0; i < each_value_1.length; i += 1) {
		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
	}

	return {
		c() {
			div = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			t = space();
			attr(div, "class", "strip");
		},
		m(target, anchor) {
			insert(target, div, anchor);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div, null);
				}
			}

			append(div, t);
		},
		p(ctx, dirty) {
			if (dirty & /*strips*/ 2) {
				each_value_1 = ensure_array_like(/*strip*/ ctx[7].keys());
				let i;

				for (i = 0; i < each_value_1.length; i += 1) {
					const child_ctx = get_each_context_1(ctx, each_value_1, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block_1(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div, t);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value_1.length;
			}
		},
		d(detaching) {
			if (detaching) {
				detach(div);
			}

			destroy_each(each_blocks, detaching);
		}
	};
}

function create_fragment(ctx) {
	let div2;
	let div0;
	let logo_1;
	let updating_strips;
	let t;
	let div1;
	let current;

	function logo_1_strips_binding(value) {
		/*logo_1_strips_binding*/ ctx[3](value);
	}

	let logo_1_props = {};

	if (/*strips*/ ctx[1] !== void 0) {
		logo_1_props.strips = /*strips*/ ctx[1];
	}

	logo_1 = new Logo({ props: logo_1_props });
	/*logo_1_binding*/ ctx[2](logo_1);
	binding_callbacks.push(() => bind(logo_1, 'strips', logo_1_strips_binding));
	let each_value = ensure_array_like(/*strips*/ ctx[1]);
	let each_blocks = [];

	for (let i = 0; i < each_value.length; i += 1) {
		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
	}

	return {
		c() {
			div2 = element("div");
			div0 = element("div");
			create_component(logo_1.$$.fragment);
			t = space();
			div1 = element("div");

			for (let i = 0; i < each_blocks.length; i += 1) {
				each_blocks[i].c();
			}

			attr(div0, "id", "svgcontain");
			attr(div1, "id", "stripBuilder");
			attr(div2, "id", "main");
		},
		m(target, anchor) {
			insert(target, div2, anchor);
			append(div2, div0);
			mount_component(logo_1, div0, null);
			append(div2, t);
			append(div2, div1);

			for (let i = 0; i < each_blocks.length; i += 1) {
				if (each_blocks[i]) {
					each_blocks[i].m(div1, null);
				}
			}

			current = true;
		},
		p(ctx, [dirty]) {
			const logo_1_changes = {};

			if (!updating_strips && dirty & /*strips*/ 2) {
				updating_strips = true;
				logo_1_changes.strips = /*strips*/ ctx[1];
				add_flush_callback(() => updating_strips = false);
			}

			logo_1.$set(logo_1_changes);

			if (dirty & /*strips*/ 2) {
				each_value = ensure_array_like(/*strips*/ ctx[1]);
				let i;

				for (i = 0; i < each_value.length; i += 1) {
					const child_ctx = get_each_context(ctx, each_value, i);

					if (each_blocks[i]) {
						each_blocks[i].p(child_ctx, dirty);
					} else {
						each_blocks[i] = create_each_block(child_ctx);
						each_blocks[i].c();
						each_blocks[i].m(div1, null);
					}
				}

				for (; i < each_blocks.length; i += 1) {
					each_blocks[i].d(1);
				}

				each_blocks.length = each_value.length;
			}
		},
		i(local) {
			if (current) return;
			transition_in(logo_1.$$.fragment, local);
			current = true;
		},
		o(local) {
			transition_out(logo_1.$$.fragment, local);
			current = false;
		},
		d(detaching) {
			if (detaching) {
				detach(div2);
			}

			/*logo_1_binding*/ ctx[2](null);
			destroy_component(logo_1);
			destroy_each(each_blocks, detaching);
		}
	};
}

function instance($$self, $$props, $$invalidate) {
	let logo;
	let strips = [["#FB405A", "#7A2259"], ["#7A2259", "#FB405A"], ["#FB405A", "#7A2259"]];

	function logo_1_binding($$value) {
		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
			logo = $$value;
			$$invalidate(0, logo);
		});
	}

	function logo_1_strips_binding(value) {
		strips = value;
		$$invalidate(1, strips);
	}

	const click_handler = strip => {
		strip.splice(strip.length - 1, 0, "#FFFFFF");
		$$invalidate(1, strips);
	};

	function input_input_handler(index, each_value, strip_index) {
		each_value[strip_index][index] = this.value;
		$$invalidate(1, strips);
	}

	const click_handler_1 = (strip, index) => {
		strip.splice(index, 1);
		$$invalidate(1, strips);
	};

	return [
		logo,
		strips,
		logo_1_binding,
		logo_1_strips_binding,
		click_handler,
		input_input_handler,
		click_handler_1
	];
}

class App extends SvelteComponent {
	constructor(options) {
		super();
		init(this, options, instance, create_fragment, safe_not_equal, {});
	}
}

new App({
    target: document.body
});
//# sourceMappingURL=logo_generator.js.map
