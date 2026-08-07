/**
 * Syntax-level warnings for constructs that are legal TypeScript but
 * off-idiom for botscript's safety model.
 *
 *   SYN002  A native `throw` statement was detected in a fn body (?bs 0.7+).
 *           Native throws bypass botscript's Result-based error contract:
 *           callers relying on `?` unwrap, `match`, or declared `throws {}`
 *           propagation will not observe exceptions raised via `throw`. The
 *           idiomatic fix is `return err(new ErrorType(...))`.
 *
 *   SYN003  A `console.*` call was detected in a fn body (?bs 0.7+).
 *           Direct console calls bypass botscript's capability model: the
 *           compiler cannot see or enforce the `stdout`/`stderr` capability
 *           declaration for output that goes through `console`. Use
 *           `stdout.write(...)` or `stderr.write(...)` so the output surface
 *           is explicit in the fn's `uses { stdout }` / `uses { stderr }`
 *           clause and visible to callers.
 *
 *   SYN004  An `eval(...)`, `Function(...)`, or `new Function(...)` call was
 *           detected in a fn body (?bs 0.7+). These execute a string as code
 *           at runtime, bypassing all static capability, resource, and safety
 *           checks the compiler would otherwise enforce.
 *
 *   SYN005  A `process.env` access was detected in a fn body (?bs 0.7+).
 *           `process.env` is a global deployment-environment namespace. Reads
 *           and writes to it are invisible to callers — no capability or
 *           resource declaration covers env-var access, so the fn silently
 *           depends on runtime deployment values that callers cannot see,
 *           audit, or mock in tests. The idiomatic fix is to pass config
 *           and secrets as explicit fn parameters.
 *
 *   SYN006  A `process.exit()` call was detected in a fn body (?bs 0.7+).
 *           `process.exit()` terminates the entire host process — not just the
 *           fn, not just the bot. It produces no return value and bypasses
 *           Result propagation, throws {}, match, and any caller recovery
 *           path. The idiomatic fix is `return err(...)` so the caller can
 *           decide whether to terminate.
 *
 *   SYN007  A `fetch(url)` or `fetch?.(url)` call was detected in a fn body (?bs 0.7+).
 *           `fetch` makes HTTP requests at runtime but is invisible to botscript's
 *           capability model: CAP001 checks for `http.*` member calls, not the `fetch`
 *           global. A fn that calls `fetch` has an undeclared network dependency.
 *           Excluded: member calls (`obj.fetch`), function/fn/function* declarations named
 *           `fetch`, object/class method shorthands, and TypeScript method
 *           signatures (`{ fetch(url): T; }`). The `:` exclusion is guarded
 *           against ternary consequents (`cond ? fetch(url) : other`).
 *
 *   SYN008  A `new WebSocket(url)` / `WebSocket(url)` call was detected in a fn body (?bs 0.7+).
 *           `WebSocket` opens a persistent bidirectional connection at runtime but is
 *           invisible to botscript's capability model: CAP001 checks for `http.*` member
 *           calls, not the `WebSocket` global. A fn that constructs a WebSocket has an
 *           undeclared network dependency that no capability declaration can see.
 *           Excluded: member calls (`obj.WebSocket`), `function`/`fn`/`function*` declarations named
 *           `WebSocket`, object/class method shorthands, and TypeScript method
 *           signatures (`{ WebSocket(url): T; }`). The `:` exclusion is guarded
 *           against ternary consequents (`cond ? WebSocket(url) : other`, including
 *           `cond ? new WebSocket(url) : other`). Generic `<T>` detection only when
 *           preceded by `new` (avoids false-positives on `WebSocket < x > (y)` comparisons).
 *
 *   SYN009  A `new XMLHttpRequest()`, `XMLHttpRequest()`, `new XMLHttpRequest<T>()`,
 *           or no-parens `new XMLHttpRequest` was detected in a fn body (?bs 0.7+).
 *           XMLHttpRequest opens an HTTP connection invisible to CAP001 (which checks
 *           `http.*` member calls). A fn that constructs an XHR has an undeclared `net`
 *           dependency. Excluded: member calls (`obj.XMLHttpRequest`), object/class method
 *           shorthands, and TypeScript method signatures.
 *
 *   SYN010  A `setTimeout(...)`, `setInterval(...)`, or `queueMicrotask(...)`
 *           call was detected in a fn body (?bs 0.7+). These globals schedule
 *           callbacks to run after the current fn returns — any effects inside
 *           those callbacks are invisible to callers: no capability declaration,
 *           no `writes {}` label, and no `throws {}` entry covers them.
 *           Excluded: member calls (`obj.setTimeout`), function/fn/function* declarations
 *           named `setTimeout`, and object/class method shorthands.
 *
 *   SYN011  A dynamic `import(specifier)` call was detected in a fn body (?bs 0.7+).
 *           Dynamic imports load a module at runtime whose capability surface is
 *           unbounded: CAP001 checks for stdlib namespace calls, not dynamic module
 *           loads. A fn that calls `import()` has an undeclared capability surface
 *           proportional to everything the dynamically loaded module might do at runtime.
 *           `import.meta` (followed by `.`) is excluded — it's a property, not a call.
 *           Excluded: member calls, `fn import(...)` declarations, object method shorthands.
 *
 *   SYN012  A `new EventSource(url)`, `EventSource(url)`, `EventSource?.(url)`, or TypeScript
 *           instantiation form `new EventSource<T>(url)` was detected in a fn body (?bs 0.7+).
 *           `EventSource` opens a persistent server-sent-events connection at runtime but is
 *           invisible to botscript's capability model: CAP001 checks for `http.*` member
 *           calls, not the `EventSource` global. A fn that constructs an EventSource has an
 *           undeclared network dependency.
 *           Excluded: member calls (`obj.EventSource`), `function`/`fn` declarations named
 *           `EventSource`, object/class method shorthands, and TypeScript method signatures.
 *           The `:` exclusion is guarded against ternary consequents.
 *
 *   SYN013  A `new Worker(scriptURL)`, `Worker(scriptURL)`, `Worker?.(scriptURL)`,
 *           `new SharedWorker(scriptURL)`, `SharedWorker(scriptURL)`, or
 *           `SharedWorker?.(scriptURL)` was detected in a fn body (?bs 0.7+). Worker construction
 *           spawns a new JS execution context whose capability surface is unbounded: the worker
 *           script can make network requests, access storage, and perform any operation — none of
 *           it visible in the spawning fn's `uses {}`, `reads {}`, or `writes {}` declarations.
 *           Excluded: member calls (`obj.Worker`), `function`/`fn` declarations named
 *           `Worker`/`SharedWorker`, object/class method shorthands, and TypeScript method
 *           signatures. The `:` exclusion is guarded against ternary consequents.
 *
 *   SYN014  A `new BroadcastChannel(name)`, `BroadcastChannel(name)`, or TypeScript
 *           instantiation form `new BroadcastChannel<T>(name)` was detected in a fn body
 *           (?bs 0.7+). `BroadcastChannel` opens a cross-context message channel at runtime
 *           that any tab, window, or worker on the same origin can post to or receive from —
 *           invisible to botscript's capability model: CAP001 checks for stdlib namespace
 *           calls, not the `BroadcastChannel` global. A fn that constructs a BroadcastChannel
 *           has an undeclared cross-context messaging dependency.
 *           Excluded: member calls (`obj.BroadcastChannel`), `function`/`fn`/`function*` declarations
 *           named `BroadcastChannel`, object/class method shorthands, and TypeScript method
 *           signatures. The `:` exclusion is guarded against ternary consequents.
 *
 *   SYN015  A `localStorage.*` or `sessionStorage.*` access was detected in a fn body
 *           (?bs 0.7+). `localStorage` and `sessionStorage` are synchronous Web Storage API
 *           globals — same-origin persistent (localStorage) or session-scoped (sessionStorage)
 *           key-value stores — invisible to botscript's capability model: `reads {}` / `writes {}`
 *           labels cover declared resource identifiers, not the Web Storage API globals. A fn
 *           that accesses either global has undeclared persistent state dependencies.
 *           Detection: `localStorage` or `sessionStorage` ident not preceded by `.`/`?.`,
 *           followed by `.` or `?.`. `fn`/`function` declarations named `localStorage`/
 *           `sessionStorage` and bare references are excluded.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN016  An `indexedDB.*` access was detected in a fn body (?bs 0.7+).
 *           `indexedDB` is same-origin persistent database storage invisible to botscript's
 *           capability model: `reads {}` / `writes {}` labels cover declared resource
 *           identifiers, not the Web Storage API globals. Unlike `localStorage`, `indexedDB`
 *           is asynchronous and has no practical size limit. A fn that accesses `indexedDB`
 *           has undeclared persistent state dependencies — callers cannot observe or audit
 *           them from the fn's declared surface.
 *           Detection: `indexedDB` not preceded by `.`/`?.`, followed by `.` or `?.`.
 *           `fn`/`function` declarations named `indexedDB` and bare references are excluded.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN017  A `new Notification(title)`, `Notification(title)`, `Notification?.(title)`, or
 *           TypeScript instantiation form `new Notification<T>(title)` was detected in a fn body (?bs 0.7+).
 *           `Notification` fires a user-visible browser notification at runtime — a UI side
 *           effect invisible to botscript's capability model: no `uses {}`, `reads {}`, or
 *           `writes {}` declaration covers notification dispatch. Callers cannot observe,
 *           audit, or suppress the effect from the fn's declared surface.
 *           Excluded: member calls (`obj.Notification`), `function`/`fn` declarations named
 *           `Notification`, object/class method shorthands, and TypeScript method signatures.
 *           The `:` exclusion is guarded against ternary consequents.
 *
 *   SYN018  A `Math.random()`, `Math?.random()`, or `Math.random?.()` call was detected in a fn body (?bs 0.7+).
 *           `Math.random` generates a random float at runtime but is invisible to botscript's
 *           capability model: `uses { random }` covers `random.*` stdlib calls, not the
 *           `Math` global. A fn that calls `Math.random()` has an undeclared randomness
 *           dependency — callers cannot see it, and tests cannot deterministically mock or
 *           suppress it the way they can the `random` stdlib namespace.
 *           Detection: `Math` not preceded by `.`/`?.`, followed by `.` or `?.`, member is
 *           `random`, followed by `(` or `?.(` (call confirmation). Bare `Math.random`
 *           references (without `()`) are excluded. `unsafe {}` blocks and `unsafe "reason" fn`
 *           bodies are suppressed.
 *
 *   SYN019  A `crypto.getRandomValues(...)` or `crypto.randomUUID()` call was detected in a
 *           fn body (?bs 0.7+). These calls generate cryptographic randomness at runtime but
 *           are invisible to botscript's capability model: `uses { random }` covers `random.*`
 *           stdlib calls, not the `crypto` global. A fn that calls `crypto.getRandomValues()`
 *           or `crypto.randomUUID()` has an undeclared randomness dependency — tests cannot
 *           control the output and callers cannot see the dependency in the fn header.
 *           Detection: `crypto` ident not preceded by `.`/`?.`, followed by `.` or `?.`,
 *           followed by `getRandomValues` or `randomUUID`, followed by `(` or `?.(`.
 *           `fn`/`function` declarations named `crypto` and non-randomness members are excluded.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN020  A `Date.now()`, `new Date()`, `new Date` (no parens), or `Date()` call was detected
 *           in a fn body (?bs 0.7+). These forms inject the current time at runtime but are invisible
 *           to botscript's capability model: `uses { time }` covers `time.*` stdlib calls, not the
 *           `Date` global. A fn that calls these forms has an undeclared time dependency — callers
 *           cannot see it and tests cannot control the time value observed by the fn.
 *           Detection paths:
 *           1. `Date.now()` / `Date?.now()` / `Date.now?.()` — `Date` not preceded by `.`/`?.`,
 *              followed by `.`/`?.`, member is `now`, followed by `(`/`?.(`.
 *           2. `new Date()` / `new Date<T>()` — `Date` preceded by `new`, followed by empty
 *              parens (arg-count check: first token inside `(…)` must be `)`). Generic scan
 *              only when `new` precedes to avoid `Date < x > (y)` comparison false-positives.
 *           3. `new Date` (no parentheses) — `Date` preceded by `new`, not followed by `(`, `<`, `?.`, or `.`
 *              (equivalent to `new Date()` in JS/TS — creates a Date object for current time).
 *           4. `Date(...)` / `Date?.()` — bare call (any args; JS ignores them and returns current date string).
 *           Excluded: `new Date(timestamp)` / `new Date("str")` / `new Date(y,m,d,…)` (explicit
 *           args), `Date.parse(str)` / `Date.UTC(…)` (no ambient time), `obj.Date()` (member
 *           call), fn/function/function* declarations named `Date`, method shorthands, TS method
 *           signatures. `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN021  A `performance.now()` or `performance.timeOrigin` access was detected in a fn body (?bs 0.7+).
 *           `performance.now()` returns a high-resolution monotonic timestamp (milliseconds since
 *           the page/process started) and `performance.timeOrigin` exposes the absolute epoch of
 *           that clock. Both inject ambient timing information at runtime but are invisible to
 *           botscript's capability model: `uses { time }` covers `time.*` stdlib calls, not the
 *           `performance` global. A fn that reads these values has an undeclared time dependency —
 *           callers cannot see it and tests cannot control the clock value observed by the fn.
 *           Detection:
 *           1. `performance.now()` / `performance?.now()` / `performance.now?.()` — `performance`
 *              not preceded by `.`/`?.`, followed by `.`/`?.`, member is `now`, followed by `(`/`?.(`.
 *           2. `performance.timeOrigin` / `performance?.timeOrigin` — `performance` not preceded
 *              by `.`/`?.`, followed by `.`/`?.`, member is `timeOrigin` (property, no call needed).
 *           Excluded: `obj.performance.*` (member call), fn/function/function* declarations named `performance`,
 *           TS method signatures. `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN022  A `process.argv`, `process.cwd`, `process.platform`, `process.arch`,
 *           `process.pid`, `process.ppid`, `process.version`, `process.versions`,
 *           `process.hrtime`, `process.uptime`, `process.memoryUsage`,
 *           `process.cpuUsage`, or `process.resourceUsage` access was detected in a fn body
 *           (?bs 0.7+). These read ambient Node.js runtime or deployment state at runtime but
 *           are invisible to botscript's capability model — no `uses {}`, `reads {}`, or
 *           `writes {}` declaration covers them. A fn that reads these values has an undeclared
 *           dependency: callers cannot see it and tests cannot control the observed value.
 *           Note: `process.env` is covered by SYN005; `process.exit` is covered by SYN006.
 *           Excluded: member calls on a local binding (`obj.process.*`), fn/function declarations
 *           named `process`. `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN023  A `navigator.<member>` access was detected in a fn body (?bs 0.7+), where the
 *           member is one of the ambient browser capability surfaces:
 *             geolocation     — requests user location; a real capability concern
 *             clipboard       — clipboard read/write (sensitive data access)
 *             mediaDevices    — camera/microphone access
 *             serviceWorker   — background worker registration
 *             permissions     — browser permission queries
 *             onLine          — ambient network connectivity state
 *             userAgent       — ambient browser fingerprint
 *             language / languages — ambient locale
 *             platform        — ambient device/OS type
 *             hardwareConcurrency — CPU core count
 *             deviceMemory    — RAM available
 *             connection      — NetworkInformation API (ambient connectivity detail)
 *             wakeLock        — screen wake lock requests
 *           These are invisible to botscript's capability model: `uses {}`, `reads {}`, and
 *           `writes {}` declarations cover declared stdlib namespaces and resource labels, not
 *           the `navigator` global. A fn that accesses these members has undeclared browser
 *           capability dependencies — callers cannot see them and tests cannot control or mock them.
 *           Excluded: `obj.navigator.*` (member on a local binding), fn/function declarations
 *           named `navigator`, member accesses not in the high-concern list above.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN024  A `document.cookie` access was detected in a fn body (?bs 0.7+).
 *           `document.cookie` is a read/write persistent storage mechanism invisible to botscript's
 *           capability model. Unlike `localStorage` (SYN015), cookies are also transmitted with
 *           every matching HTTP request. Excluded: `obj.document.cookie`, fn/function/function*
 *           declarations named `document`. `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN025  A `requestAnimationFrame(cb)` call was detected in a fn body (?bs 0.7+).
 *           `requestAnimationFrame` schedules `cb` to run before the next browser repaint —
 *           after the current fn has returned. Any effects inside the callback are invisible to
 *           callers: no capability declaration, no `writes {}` label, no `throws {}` entry covers them.
 *           Excluded: member calls (`obj.requestAnimationFrame`), `fn`/`function`/`function*`
 *           declarations named `requestAnimationFrame`, and object/class method shorthands.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN026  A `requestIdleCallback(cb)` call was detected in a fn body (?bs 0.7+).
 *           `requestIdleCallback` schedules `cb` to run during a browser idle period —
 *           after the current fn has returned. Any effects inside the callback are invisible to
 *           callers: no capability declaration, no `writes {}` label, no `throws {}` entry covers them.
 *           Excluded: member calls (`obj.requestIdleCallback`), `fn`/`function`/`function*`
 *           declarations named `requestIdleCallback`, and object/class method shorthands.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN027  A `new MutationObserver(cb)`, `new IntersectionObserver(cb)`, `new ResizeObserver(cb)`,
 *           or `new PerformanceObserver(cb)` constructor call was detected in a fn body (?bs 0.7+).
 *           Observer constructors register `cb` to fire when the browser observes a condition —
 *           after the current fn has returned, at an indeterminate future time. Any effects inside
 *           `cb` are invisible to callers: no capability declaration, no `writes {}` label, no
 *           `throws {}` entry reflects them. Bare calls (without `new`) and optional calls are
 *           also detected.
 *           Excluded: member calls (`obj.MutationObserver`), `fn`/`function`/`function*`
 *           declarations named any of the four observer names, and object/class method shorthands.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *           Note: SYN023 now also covers `navigator.sendBeacon` — fire-and-forget network requests
 *           through navigator that bypass the net capability model.
 *
 *   SYN028  A `new Proxy(target, handler)` constructor call was detected in a fn body (?bs 0.7+).
 *           `Proxy` creates a virtualized object that intercepts all property access and method
 *           calls on `target` via `handler` traps. If `target` is a capability-bearing object,
 *           the Proxy launders its capability surface: callers see an innocent object while
 *           operations route through the underlying capability without a matching `uses {}`
 *           declaration. If `handler` closes over capabilities, trap bodies perform arbitrary
 *           effects invisible to the fn header. The compiler cannot see through a Proxy —
 *           the capability surface appears narrower than it actually is.
 *           Bare `Proxy(...)` calls (without `new`) and optional calls are also detected.
 *           Excluded: member calls (`obj.Proxy`), `fn`/`function`/`function*` declarations
 *           named `Proxy`, and object/class method shorthands.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN029  A `document.write(...)` or `document.writeln(...)` call was detected in a fn body
 *           (?bs 0.7+). These methods inject a raw HTML string directly into the document parse
 *           stream — after page load they clear the entire document before writing. Both are
 *           invisible to botscript's capability model: no `uses {}`, `reads {}`, or `writes {}`
 *           declaration covers document mutation via these globals. The injected string may
 *           contain `<script>` tags or inline event handlers that static analysis cannot see.
 *           Callers cannot observe, audit, or suppress the DOM side effect from the fn's header.
 *           Excluded: `obj.document.write(...)` (member on a local binding), `fn`/`function`/
 *           `function*` declarations named `document`, and TS method signatures.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN030  A `new FinalizationRegistry(callback)` or `FinalizationRegistry(callback)` call was
 *           detected in a fn body (?bs 0.7+). `FinalizationRegistry` registers a cleanup callback
 *           that fires when a registered target is garbage-collected — the most unpredictable
 *           scheduler in the platform: GC timing is non-deterministic, implementation-specific,
 *           and not tied to any observable event in the fn's execution. Any effects inside the
 *           callback (network calls, storage writes, etc.) are invisible to callers and cannot
 *           be declared in the fn header. Unlike timers or observers, there is no cancel path.
 *           Excluded: member calls (`obj.FinalizationRegistry`), `fn`/`function`/`function*`
 *           declarations named `FinalizationRegistry`, object/class method shorthands, and
 *           TypeScript method signatures. `unsafe {}` blocks are suppressed.
 *
 *   SYN031  A `new MessageChannel()`, `MessageChannel()`, or `MessageChannel?.()` call was detected
 *           in a fn body (?bs 0.7+). `MessageChannel` creates two paired `MessagePort` objects
 *           (`port1`, `port2`). Messages sent via `port.postMessage(data)` are delivered
 *           asynchronously to the other port's `.onmessage` handler — after the current fn has
 *           returned, in a separate task. Any effects inside the handler (network calls, storage
 *           writes, stdout) are invisible to botscript's static analysis and cannot be declared
 *           in the fn's `uses {}`, `reads {}`, or `writes {}` clause. Unlike `BroadcastChannel`
 *           (same-origin broadcast to all listeners), a `MessageChannel` enables direct
 *           point-to-point async communication between any two contexts (windows, workers,
 *           iframes) — the capability surface of the receiving handler is entirely invisible
 *           to the fn that creates the channel.
 *           Excluded: member calls (`obj.MessageChannel`), `fn`/`function`/`function*`
 *           declarations named `MessageChannel`, object/class method shorthands, and
 *           TypeScript method signatures. `unsafe {}` blocks are suppressed.
 *
 *   SYN032  A `new RTCPeerConnection(config)`, `RTCPeerConnection(config)`, or `RTCPeerConnection?.(config)`
 *           call was detected in a fn body (?bs 0.7+). `RTCPeerConnection` initiates a WebRTC
 *           peer-to-peer session. Once the ICE handshake completes, the connection can exchange
 *           arbitrary data via `RTCDataChannel` or stream media — directly over UDP, bypassing all
 *           HTTP-layer visibility. CAP001 checks for `http.*` member calls; `RTCPeerConnection` is
 *           invisible to it. ICE candidates and connection events fire asynchronously after the fn
 *           returns — handler effects cannot be declared in the fn's `uses {}`, `reads {}`, or
 *           `writes {}` clause.
 *           Excluded: member calls (`obj.RTCPeerConnection`), `fn`/`function`/`function*`
 *           declarations named `RTCPeerConnection`, object/class method shorthands, and
 *           TypeScript method signatures. `unsafe {}` blocks are suppressed.
 *
 *   SYN033  An `import.meta.env.*` access was detected in a fn body (?bs 0.7+).
 *           `import.meta.env` is the standard pattern for reading build-time environment
 *           variables injected by Vite, Vitest, esbuild, and similar bundlers — the
 *           browser-targeted / isomorphic equivalent of Node.js's `process.env` (SYN005).
 *           Both have the same structural problem: the fn silently depends on a deployment
 *           configuration value that callers cannot see, pass, or override in tests.
 *           Detection: `import` ident not preceded by `.`/`?.`, followed by `.`, then `meta`,
 *           then `.`/`?.`, then `env`. Only the three-token chain `import.meta.env` fires;
 *           `import.meta.url`, `import.meta.resolve`, and other `import.meta.*` accesses
 *           are excluded. `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN034  A `location.<member>` access was detected in a fn body (?bs 0.7+).
 *           The global `location` object has two concern categories:
 *             • Environment reads: `location.href`, `.pathname`, `.search`, `.hash`,
 *               `.hostname`, `.host`, `.port`, `.protocol`, `.origin` — these read the
 *               ambient URL, which differs between deployments, test environments, and CI
 *               runs. A fn that reads `location.pathname` silently depends on the
 *               deployment URL; tests running via `file:///` or a different origin get
 *               different values without any visible declaration.
 *             • Navigation I/O: `location.assign(url)`, `.replace(url)`, `.reload()` —
 *               these redirect or reload the page; the side effect is invisible to callers
 *               and cannot be declared in `uses {}`, `reads {}`, or `writes {}` headers.
 *           Detection: `location` ident not preceded by `.`/`?.`, followed by `.`/`?.`,
 *           then a member name in the high-concern set. `window.location.href` is excluded
 *           (location preceded by `.`). `unsafe {}` blocks are suppressed.
 *
 *   SYN035  A `history.<member>` access was detected in a fn body (?bs 0.7+).
 *           The global `history` object has two concern categories:
 *             • History mutations and navigation: `history.pushState(state, title, url)`,
 *               `.replaceState(state, title, url)`, `.back()`, `.forward()`, `.go(delta)` —
 *               these alter the browser history stack and/or the address bar. They are
 *               visible, persistent side effects that outlive the fn call and cannot be
 *               declared in any fn header.
 *             • Ambient state reads: `history.length`, `.state`, `.scrollRestoration` —
 *               these return values that differ depending on how the user navigated to the
 *               current page; the same fn returns different results in different sessions
 *               without any visible declaration.
 *           Detection: `history` ident not preceded by `.`/`?.`, followed by `.`/`?.`,
 *           then a member name in the high-concern set. `window.history.pushState` is
 *           excluded (history preceded by `.`). `unsafe {}` blocks are suppressed.
 *
 *   SYN036  A `WebAssembly.instantiate(bytes)`, `.instantiateStreaming(response)`,
 *           `.compile(bytes)`, `.compileStreaming(response)`, `new WebAssembly.Instance(module)`,
 *           or `new WebAssembly.Module(bytes)` call was detected in a fn body (?bs 0.7+).
 *           These forms execute or compile a binary WASM module at runtime. A WASM module's
 *           capability surface is entirely opaque to botscript's static analysis: the module can
 *           make network requests, write to memory, call any imported JS function, and produce any
 *           side effect — none of it visible in the caller's `uses {}`, `reads {}`, or `writes {}`
 *           declarations. This is the WASM analogue of `eval()` (SYN004): arbitrary execution
 *           from a binary blob that the compiler cannot inspect.
 *           Excluded: `obj.WebAssembly.*` (member on a local binding), `fn`/`function`/`function*`
 *           declarations named `WebAssembly`, `WebAssembly.*` accesses where the member is not in
 *           the execution/compilation set (e.g. `WebAssembly.validate`). `unsafe {}` blocks and
 *           `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN037  A SYN-guarded global is invoked via `.call()`, `.apply()`, or `.bind()` in
 *           a fn body (?bs 0.7+). Expressions like `fetch.call(null, url)`,
 *           `WebSocket.apply(null, [url])`, or `setTimeout.bind(null)(fn, ms)` invoke
 *           the guarded global without using its name as the call-site token —
 *           SYN007–SYN036 switch on the callee name and therefore cannot fire. The
 *           same undeclared capability (network, timer, etc.) is exercised at runtime.
 *           Detection: when token is `call`/`apply`/`bind`, look back through `.`/`?.`
 *           to the receiver; if the receiver is a SYN-guarded global name not itself
 *           preceded by `.`/`?.`, and the method is followed by `(`/`?.(`, warn SYN037.
 *           Excluded: `obj.fetch.call(...)` (receiver is a member, not a bare global),
 *           fn/function declarations named `call`/`apply`/`bind`.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN038  A property write to `globalThis`, `window`, or `self` was detected in a fn body
 *           (?bs 0.7+). Writing to the global object (`globalThis.foo = value`) mutates shared
 *           ambient state that any code in the runtime can observe — an undeclared side effect
 *           invisible to botscript's capability model: no `uses {}`, `reads {}`, or `writes {}`
 *           declaration covers global scope mutations. Callers cannot see the dependency and
 *           tests cannot isolate it without mocking the global namespace.
 *           Detection: `globalThis`/`window`/`self` ident not preceded by `.`/`?.`, followed by
 *           `.`/`?.` + member name + assignment operator (`=`, `+=`, `-=`, `*=`, etc.).
 *           Excluded: member calls on local bindings (`obj.globalThis.foo = v`), fn declarations
 *           named `globalThis`/`window`/`self`, reads (`globalThis.foo` without an assignment),
 *           and delete expressions.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN039  An `Object.defineProperty(...)` or `Object.defineProperties(...)` call was detected
 *           in a fn body (?bs 0.7+). These calls redefine property descriptors — value, writable,
 *           enumerable, configurable, get, set — at runtime, with permanent or stealthy effects
 *           invisible to botscript's capability model: no `uses {}`, `reads {}`, or `writes {}`
 *           declaration covers property-descriptor mutations. When the target is a shared or global
 *           object, the mutation affects all callers in the runtime and can silently override
 *           capability-gated globals (`fetch`, `WebSocket`, `setTimeout`) in ways that bypass
 *           SYN007–SYN038 at runtime even when source-level checks passed.
 *           Detection: `Object` not preceded by `.`/`?.`, followed by `.` or `?.`, method is
 *           `defineProperty` or `defineProperties`, followed by `(` or `?.(`.
 *           `fn`/`function` declarations named `Object` are excluded.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN040  An `Object.setPrototypeOf(target, proto)` or `target.__proto__ = proto` was detected
 *           in a fn body (?bs 0.7+). These replace the prototype chain of `target` at runtime —
 *           silently redirecting all property lookups (including capability-gated globals such as
 *           `fetch`, `WebSocket`, `setTimeout`) through a new chain invisible to the static
 *           capability model. SYN007–SYN039 checks fire on source-level tokens; a prior prototype
 *           mutation defeats those checks at runtime even though the source appeared safe.
 *           Detection:
 *             `Object` — not preceded by `.`/`?.`, not a fn/function declaration, followed by `.`
 *             or `?.`, followed by `setPrototypeOf`, followed by `(` or `?.(`.
 *             `__proto__` — preceded by `.` or `?.`, followed by `=` (plain assignment only).
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN041  A `globalThis.<name>`, `window.<name>`, or `self.<name>` access was detected
 *           in a fn body (?bs 0.7+), where `<name>` is one of the globals monitored by
 *           SYN004–SYN041 as bare identifiers. The global-receiver form bypasses those
 *           checks: `globalThis.fetch(...)` reaches the network without any capability
 *           warning, because SYN007's bare-`fetch` detection excludes member-call forms.
 *           The capability bypass is identical at runtime.
 *           Excluded: cases where the receiver ident is itself a member access
 *           (`obj.globalThis.fetch`), fn/function declarations named
 *           `globalThis`/`window`/`self`. `unsafe {}` blocks and `unsafe "reason" fn`
 *           bodies are suppressed.
 *
 *   SYN042  A `Reflect.<method>(...)` call on one of the six dangerous Reflect methods
 *           was detected in a fn body (?bs 0.7+). `Reflect.apply` and `Reflect.construct`
 *           call any function or constructor dynamically, bypassing the source-level ident
 *           checks of SYN004–SYN041 (`Reflect.apply(fetch, null, [url])` reaches the
 *           network with no capability warning). `Reflect.set`, `Reflect.defineProperty`,
 *           and `Reflect.deleteProperty` mutate object properties at runtime in ways
 *           invisible to the capability model (parallel to SYN039). `Reflect.setPrototypeOf`
 *           replaces the prototype chain (parallel to SYN040), defeating runtime guards.
 *           Detection: `Reflect` ident not preceded by `.`/`?.`, not a fn declaration,
 *           followed by `.`/`?.`, followed by one of the six method names, followed by `(`
 *           or `?.(`. `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN043  A computed string bracket access on a global receiver — `globalThis['fetch']`,
 *           `window['eval']`, `self['setTimeout']` — was detected in a fn body (?bs 0.7+).
 *           SYN041 catches dot-notation global-receiver bypasses (`globalThis.fetch`), but
 *           the bracket form puts the dangerous name inside a string literal where the
 *           token-level ident checks cannot see it; the capability bypass at runtime is
 *           identical. Detection: `globalThis`/`window`/`self` ident not preceded by
 *           `.`/`?.`, followed by `[<string-literal>]` where the literal value is one of
 *           the SYN041-monitored dangerous members. Template literals and dynamic keys
 *           are out of scope. `unsafe {}` blocks and `unsafe "reason" fn` bodies are
 *           suppressed.
 *
 *   SYN044  A module-scope binding that aliases a SYN-guarded global is called inside a
 *           fn body (?bs 0.7+). `const f = fetch` followed by `f(url)` inside a fn body
 *           bypasses SYN004–SYN043 because all name-token checks fire on the guarded
 *           identifier itself — the alias name `f` is not in any watch-list, so the
 *           capability model is invisible to callers. Detection: a `const`/`let`/`var`
 *           binding at module scope whose initialiser is exactly a bare SYN037-guarded
 *           global name (no member access, no call on the RHS); when that binding name
 *           appears as a direct call in any fn body (not a method access, not a
 *           declaration), SYN044 fires. Fn-body-level aliases are not tracked to avoid
 *           shadowing false positives. `unsafe {}` blocks and `unsafe "reason" fn`
 *           bodies are suppressed.
 *
 *   SYN045  A module-scope binding that aliases a global receiver object (`globalThis`,
 *           `window`, `self`) is used as a member-access receiver for a SYN041-dangerous
 *           member inside a fn body (?bs 0.7+). `const g = globalThis` at module scope
 *           followed by `g.fetch(url)` inside a fn body bypasses SYN041–SYN043 because
 *           those checks fire on the literal receiver tokens `globalThis`/`window`/`self`
 *           — the alias name `g` is not recognised as a global receiver, so the capability
 *           bypass is invisible. At runtime `g.fetch(url)` and `globalThis.fetch(url)` are
 *           identical. Detection: `const`/`let`/`var` at module scope whose RHS is exactly
 *           one of the three global-receiver idents; when that alias appears as a
 *           member-access receiver (`alias.member` or `alias?.member`) for any member in
 *           SYN041_DANGEROUS_MEMBERS inside any fn body, SYN045 fires. Fn-body-level
 *           aliases are not tracked. `unsafe {}` blocks and `unsafe "reason" fn` bodies
 *           are suppressed.
 *
 *   SYN046  A module-scope destructuring rename of a SYN-guarded global is called inside
 *           a fn body (?bs 0.7+). `const { fetch: req } = globalThis` at module scope
 *           followed by `req(url)` inside a fn body bypasses SYN004–SYN045: name-token
 *           checks fire on the canonical ident (`fetch`, `eval`, etc.) and receiver
 *           checks fire on `globalThis`/`window`/`self` — the alias name `req` appears
 *           on no watch-list, so the capability model is invisible to callers. At runtime
 *           `req(url)` and `fetch(url)` are identical. Detection: a `const`/`let`/`var`
 *           destructuring at module scope whose RHS is a global-receiver ident and whose
 *           pattern contains a `dangerous: alias` rename where `dangerous` is in
 *           SYN037_GUARDED_GLOBALS; when that alias is called in any fn body (not a
 *           method access, not a declaration), SYN046 fires. Fn-body-level destructuring
 *           is not tracked. `unsafe {}` blocks and `unsafe "reason" fn` bodies are
 *           suppressed.
 *
 *   SYN047  A `global.<member>` or `global[<string-literal>]` access or `global.*`
 *           property write was detected in a fn body (?bs 0.7+). In Node.js, `global`
 *           is the native global object — runtime-equivalent to `globalThis`. All 46
 *           prior SYN checks only watch `globalThis`, `window`, and `self` receivers;
 *           `global.*` reaches any dangerous capability with no warning.
 *           Detection: `global.<member>` where `<member>` is in SYN041_DANGEROUS_MEMBERS,
 *           `global[<string-literal>]` where the literal is in SYN041_DANGEROUS_MEMBERS,
 *           or `global.<member> = ...` / `global.<member> <op>= ...` assignments.
 *           `unsafe {}` blocks and `unsafe "reason" fn` bodies are suppressed.
 *
 *   SYN049  A fn-body-local binding that aliases a global receiver object (`globalThis`,
 *           `window`, `self`) is used as a member-access receiver for a SYN041-dangerous
 *           member in the same fn body (?bs 0.7+). `const g = globalThis` inside a fn
 *           body followed by `g.fetch(url)` bypasses SYN041–SYN048: SYN041 fires on the
 *           literal receiver tokens, and SYN048 fires on direct-call aliases — but when
 *           the receiver is a fn-body-local alias `g`, neither fires. At runtime
 *           `g.fetch(url)` and `globalThis.fetch(url)` are identical. SYN045 covers
 *           module-scope receiver aliases; SYN049 closes the fn-body gap. Detection:
 *           per-fn-body pre-pass collects `const`/`let`/`var <alias> = <receiver-global>`
 *           declarations (skipping nested fn bodies); fires when alias appears as a
 *           member-access receiver (`alias.member` or `alias?.member`) for any member in
 *           SYN041_DANGEROUS_MEMBERS. `unsafe {}` blocks and `unsafe "reason" fn`
 *           bodies are suppressed.
 *
 *   SYN050  A fn-body-local destructuring rename of a SYN-guarded global is called in
 *           the same fn body (?bs 0.7+). `const { fetch: req } = globalThis` inside a fn
 *           body followed by `req(url)` bypasses SYN004–SYN049: canonical-ident checks
 *           fire on `fetch`, receiver checks fire on `globalThis`, but the alias `req`
 *           is on no watch-list. SYN046 covers module-scope destructuring renames;
 *           SYN050 closes the fn-body gap. Detection: per-fn-body pre-pass collects
 *           `const`/`let`/`var { <guarded>: <alias> } = <receiver>` declarations inside
 *           each fn body (skipping nested fn bodies); fires when the alias is called
 *           (next significant token is `(` or `?.`) in the same body. Member-access calls
 *           (`obj.req()`), declaration sites, and `unsafe {}` blocks are suppressed.
 *
 *   SYN051  A module-scope assignment-expression alias of a guarded global is called inside
 *           a fn body (?bs 0.7+). `let f; f = fetch` at module scope followed by `f(url)`
 *           inside a fn body bypasses SYN004–SYN050: all prior checks fire on the guarded
 *           identifier token, and SYN044 covers the `const/let/var f = fetch` declaration
 *           form — but when the alias is set via a bare assignment expression (not a
 *           declaration initialiser), no prior check fires. Detection: a module-scope
 *           assignment expression `<ident> = <guarded>` (not preceded by `const`/`let`/`var`
 *           or by `.`/`?.`) whose RHS is a bare guarded global name; when that alias appears
 *           as a direct call in any fn body, SYN051 fires. `unsafe {}` blocks suppressed.
 *
 *   SYN052  A module-scope assignment-expression alias of a global receiver object is used
 *           as a member-access receiver for a SYN041-dangerous member inside a fn body
 *           (?bs 0.7+). `let g; g = globalThis` at module scope followed by `g.fetch(url)`
 *           bypasses SYN041–SYN051: those checks fire on the literal receiver tokens or on
 *           declaration-form aliases; a bare assignment form is not tracked by any prior
 *           check. SYN045 covers the `const/let/var g = globalThis` declaration form;
 *           SYN052 closes the bare assignment gap. Detection: a module-scope assignment
 *           expression `<ident> = <receiver-global>` (not preceded by `const`/`let`/`var`
 *           or `.`/`?.`); fires when the alias appears as a member-access receiver
 *           (`alias.member` or `alias?.member`) for any member in SYN041_DANGEROUS_MEMBERS
 *           inside any fn body. `unsafe {}` blocks suppressed.
 *
 *   SYN053  A fn-body assignment-expression alias of a SYN-guarded global is called in the
 *           same fn body (?bs 0.7+). `let f; f = fetch` inside a fn body followed by `f(url)`
 *           bypasses SYN004–SYN052: SYN048 fires on `const/let/var f = fetch` declarations
 *           inside fn bodies, and SYN051 fires on module-scope assignment aliases, but a bare
 *           assignment expression inside a fn body is tracked by neither. SYN053 closes this
 *           remaining gap. Detection: per-fn-body pre-pass scans assignment expressions
 *           (`<ident> = <guarded>`, not preceded by `const`/`let`/`var` or `.`/`?.`/`]`)
 *           inside each fn body (excluding nested fn bodies); fires when the alias is called
 *           (next significant token is `(` or `?.`) in the same fn body. `unsafe {}` suppressed.
 *
 *   SYN054  A fn-body assignment-expression alias of a global receiver object (`globalThis`,
 *           `window`, `self`) is used as a member-access receiver for a SYN041-dangerous
 *           member in the same fn body (?bs 0.7+). `let g; g = globalThis` inside a fn body
 *           followed by `g.fetch(url)` bypasses SYN041–SYN053: SYN049 fires on
 *           `const/let/var g = globalThis` declarations inside fn bodies, and SYN052 fires on
 *           module-scope assignment aliases, but a bare assignment expression inside a fn body
 *           is tracked by neither. SYN054 closes this remaining gap. Detection: per-fn-body
 *           pre-pass scans assignment expressions (`<ident> = <receiver-global>`, not preceded
 *           by `const`/`let`/`var` or `.`/`?.`/`]`) inside each fn body (excluding nested fn
 *           bodies); fires when the alias appears as a member-access receiver (`alias.member`
 *           or `alias?.member`) for any member in SYN041_DANGEROUS_MEMBERS in the same fn
 *           body. `unsafe {}` blocks suppressed.
 *
 *   SYN055  A default-parameter alias of a SYN-guarded global is called in the fn body (?bs 0.7+).
 *           `fn run(f = fetch)` binds `fetch` to `f` as a default parameter value. All prior alias
 *           checks (SYN044/SYN048/SYN051/SYN053) start scanning from the opening `{` of the fn body,
 *           so the default-parameter binding is never tracked. When `f(url)` is called in the body,
 *           SYN007 does not fire because the call site token is `f`, not `fetch`. SYN055 closes this
 *           gap: a per-fn pre-pass scans the parameter list (token range before `bodyTokenStart`) for
 *           `<ident> = <guarded-global>` default-value patterns; fires when the alias is called
 *           (next significant token is `(` or `?.`) in the fn body. `unsafe {}` suppressed.
 *
 *   SYN056  A default-parameter alias of a global receiver object (`globalThis`, `window`, `self`)
 *           is used as a member-access receiver for a SYN041-dangerous member in the fn body (?bs 0.7+).
 *           `fn run(g = globalThis)` binds `globalThis` to `g`; all prior receiver-alias checks
 *           (SYN045/SYN049/SYN052/SYN054) start from the body `{`, so the default-parameter binding
 *           is never tracked. `g.fetch(url)` bypasses SYN041 because the receiver token is `g`, not
 *           `globalThis`. SYN056 closes the gap: a per-fn pre-pass scans the parameter list for
 *           `<ident> = <receiver-global>` default-value patterns; fires when the alias appears as a
 *           member-access receiver for any SYN041_DANGEROUS_MEMBERS member in the fn body.
 *
 * All checks share a single token scan per fn body. The outer loop runs once,
 * skipping nested fn bodies once. Per-token dispatch is a switch on tok.text
 * after a kind==="ident" guard.
 */

import type { Diagnostic } from "../diagnostics.js";
import { getErrorCode } from "../error-codes.js";
import { parseProgram } from "../parser/parse.js";
import type { Token } from "../parser/lex.js";
import { locationOf } from "./_location.js";
import { computeNesting, prevSignificant, nextSignificant } from "./_callgraph.js";
import { atLeast, type VersionInfo } from "./version.js";
import { collectUnsafeBlockRanges, isInsideRange } from "./_unsafe-ranges.js";

// Returns true when the token at `starIdx` is a `*` operator preceded by `function`,
// i.e. this ident is the name in a `function* name(...)` generator declaration.
function isFunctionStarDecl(tokens: Token[], starIdx: number): boolean {
  const star = tokens[starIdx];
  if (!star || star.kind !== "operator" || star.text !== "*") return false;
  const prevIdx = prevSignificant(tokens, starIdx - 1);
  const prev = tokens[prevIdx];
  return !!(prev && prev.kind === "ident" && prev.text === "function");
}

/**
 * Resolve the call-open-paren for an ident token at `identIdx`, handling
 * paren-grouped calls: `(fetch)(url)`, `((eval))(code)`, etc.
 *
 * Returns the index of the call `(` if the ident at `identIdx` is the sole
 * content of one or more grouping parens that are then immediately called;
 * returns null otherwise.
 *
 * Only handles the grouping form — `?.` and generic `<T>` type params are
 * handled per-case before falling through to this helper.
 */
function resolveParenGroupedCallIdx(tokens: Token[], identIdx: number): number | null {
  // Scan forward from the token immediately after the ident.
  // If the sequence is `)...)(`, the ident is inside a paren group that is called.
  let scanIdx = nextSignificant(tokens, identIdx + 1);
  // Must start with a closing paren (the group ends right after the ident).
  if (!tokens[scanIdx] || tokens[scanIdx]!.kind !== "close" || tokens[scanIdx]!.text !== ")") return null;
  // Skip all consecutive closing parens — handles `((fetch))(url)`.
  while (tokens[scanIdx]?.kind === "close" && tokens[scanIdx]?.text === ")") {
    scanIdx = nextSignificant(tokens, scanIdx + 1);
  }
  // What follows must be a `(` call.
  if (tokens[scanIdx]?.kind === "open" && tokens[scanIdx]?.text === "(") return scanIdx;
  return null;
}

/**
 * Detect paren-receiver bypass for member-access checks.
 * `(Math).random()`, `(localStorage).getItem()`, `((crypto)).getRandomValues()` etc. place
 * the receiver ident inside a paren group then access a member — bypassing token-level
 * "ident not preceded by `.`" guards that expect direct access.
 *
 * Returns the index of the `.` or `?.` token if the ident is inside `(ident)` and that
 * group is immediately followed by a member-access operator; returns null otherwise.
 */
function resolveParenGroupedMemberReceiverIdx(tokens: Token[], identIdx: number): number | null {
  let scanIdx = nextSignificant(tokens, identIdx + 1);
  if (!tokens[scanIdx] || tokens[scanIdx]!.kind !== "close" || tokens[scanIdx]!.text !== ")") return null;
  while (tokens[scanIdx]?.kind === "close" && tokens[scanIdx]?.text === ")") {
    scanIdx = nextSignificant(tokens, scanIdx + 1);
  }
  const tok = tokens[scanIdx];
  if (tok && tok.kind === "punct" && tok.text === ".") return scanIdx;
  if (tok && tok.kind === "questionDot") return scanIdx;
  return null;
}

export interface SynCheckResult {
  code: string;
  warnings: ReadonlyArray<Diagnostic>;
}

// console method names that are output/logging calls (not console.assert, console.time, etc.)
const CONSOLE_OUTPUT_METHODS = new Set([
  "log", "error", "warn", "info", "debug", "dir", "dirxml",
  "table", "trace", "group", "groupCollapsed", "groupEnd",
]);

const TIMER_GLOBALS = new Set(["setTimeout", "setInterval", "queueMicrotask"]);
const SCHEDULING_GLOBALS = new Set(["requestAnimationFrame", "requestIdleCallback"]);
const OBSERVER_CONSTRUCTORS = new Set(["MutationObserver", "IntersectionObserver", "ResizeObserver", "PerformanceObserver"]);
// process.* members covered by SYN022 (env → SYN005, exit → SYN006 are handled separately)
const SYN022_PROCESS_MEMBERS = new Set([
  "argv", "cwd", "platform", "arch", "pid", "ppid",
  "version", "versions", "hrtime", "uptime", "memoryUsage", "cpuUsage", "resourceUsage",
]);
// navigator.* members covered by SYN023 (high-concern ambient browser capability surfaces)
const SYN023_NAVIGATOR_MEMBERS = new Set([
  "geolocation", "clipboard", "mediaDevices", "serviceWorker", "permissions",
  "onLine", "userAgent", "language", "languages", "platform",
  "hardwareConcurrency", "deviceMemory", "connection", "wakeLock",
  "sendBeacon",
]);
// location.* members covered by SYN034 (navigation I/O and ambient URL reads)
const SYN034_LOCATION_MEMBERS = new Set([
  "href", "pathname", "search", "hash", "hostname", "host", "port", "protocol", "origin",
  "assign", "replace", "reload",
]);
// location members that trigger navigation (side effects vs environment reads)
const LOCATION_NAV_METHODS = new Set(["assign", "replace", "reload"]);
// history.* members covered by SYN035 (history mutation and ambient navigation state reads)
const SYN035_HISTORY_MEMBERS = new Set([
  "pushState", "replaceState", "back", "forward", "go",
  "length", "state", "scrollRestoration",
]);
// history members that mutate browser history / trigger navigation (vs ambient reads)
const HISTORY_NAV_METHODS = new Set(["pushState", "replaceState", "back", "forward", "go"]);
// WebAssembly.* members that execute or compile opaque binary code — covered by SYN036
const SYN036_WASM_MEMBERS = new Set([
  "instantiate", "instantiateStreaming", "compile", "compileStreaming", "Instance", "Module",
]);
// Reflect.* methods that bypass static name-based SYN checks — covered by SYN042
const SYN042_REFLECT_METHODS = new Set([
  "apply", "construct",             // dynamic dispatch — defeats SYN004–SYN041 name detection
  "set", "defineProperty",          // property mutation — parallel to SYN039
  "deleteProperty",                 // property deletion — invisible structural mutation
  "setPrototypeOf",                 // prototype replacement — parallel to SYN040
]);
// SYN041: dangerous globals reachable via globalThis / window / self receivers
const SYN041_DANGEROUS_MEMBERS = new Set([
  "fetch", "WebSocket", "EventSource", "Worker", "SharedWorker",
  "eval", "Function",
  "setTimeout", "setInterval", "queueMicrotask",
  "BroadcastChannel",
  "localStorage", "sessionStorage", "indexedDB",
  "Notification",
  "Math", "crypto",
  "navigator",
  "Proxy", "Reflect", "Object",
  "process",
  "caches", "RTCPeerConnection", "WebAssembly", "MessageChannel",
  "requestAnimationFrame", "requestIdleCallback",
]);
// SYN038: global object receivers whose property writes are undeclared side effects
const SYN038_GLOBAL_RECEIVERS = new Set(["globalThis", "window", "self"]);
// SYN045: global receiver objects that can be aliased at module scope to bypass SYN041–SYN043
const SYN045_RECEIVER_GLOBALS = SYN038_GLOBAL_RECEIVERS;
// SYN038: compound assignment operators that constitute a write
const SYN038_COMPOUND_ASSIGNS = new Set([
  "+=", "-=", "*=", "/=", "%=", "**=", "&=", "|=", "^=",
  "<<=", ">>=", ">>>=", "&&=", "||=", "??=",
]);
// SYN-guarded globals whose direct-call-bypass via .call()/.apply()/.bind() is caught by SYN037.
// Includes every single-token global that SYN007–SYN036 protect (member-access globals like
// Math.random or process.* are excluded — their bypass path is aliasing the member, not .call).
const SYN037_GUARDED_GLOBALS = new Set([
  "fetch",              // SYN007
  "WebSocket",          // SYN008
  "EventSource",        // SYN012
  "Worker",             // SYN013
  "SharedWorker",       // SYN013
  "BroadcastChannel",   // SYN014
  "Notification",       // SYN017
  "XMLHttpRequest",     // SYN009
  "RTCPeerConnection",  // SYN029
  "requestAnimationFrame",  // SYN031
  "requestIdleCallback",    // SYN031
  "WebAssembly",        // SYN032
  "MessageChannel",     // SYN034
  "Proxy",              // SYN035
  "Reflect",            // SYN042
  "eval",               // SYN004
  "postMessage",        // SYN027
  "addEventListener",   // SYN030
  "setTimeout",         // SYN010
  "setInterval",        // SYN010
  "queueMicrotask",     // SYN010
]);

export function passSynCheck(src: string, version: VersionInfo): SynCheckResult {
  if (!atLeast(version.resolved, "0.7")) return { code: src, warnings: [] };

  const allowGenerics = atLeast(version.resolved, "0.4");
  const program = parseProgram(src, { allowGenerics, includeNestedFns: true });
  const tokens = program.tokens;
  const warnings: Diagnostic[] = [];
  const syn002 = getErrorCode("SYN002")!;
  const syn003 = getErrorCode("SYN003")!;
  const syn004 = getErrorCode("SYN004")!;
  const syn005 = getErrorCode("SYN005")!;
  const syn006 = getErrorCode("SYN006")!;
  const syn007 = getErrorCode("SYN007")!;
  const syn008 = getErrorCode("SYN008")!;
  const syn009 = getErrorCode("SYN009")!;
  const syn010 = getErrorCode("SYN010")!;
  const syn011 = getErrorCode("SYN011")!;
  const syn012 = getErrorCode("SYN012")!;
  const syn013 = getErrorCode("SYN013")!;
  const syn014 = getErrorCode("SYN014")!;
  const syn015 = getErrorCode("SYN015")!;
  const syn016 = getErrorCode("SYN016")!;
  const syn017 = getErrorCode("SYN017")!;
  const syn018 = getErrorCode("SYN018")!;
  const syn019 = getErrorCode("SYN019")!;
  const syn020 = getErrorCode("SYN020")!;
  const syn021 = getErrorCode("SYN021")!;
  const syn022 = getErrorCode("SYN022")!;
  const syn023 = getErrorCode("SYN023")!;
  const syn024 = getErrorCode("SYN024")!;
  const syn025 = getErrorCode("SYN025")!;
  const syn026 = getErrorCode("SYN026")!;
  const syn027 = getErrorCode("SYN027")!;
  const syn028 = getErrorCode("SYN028")!;
  const syn029 = getErrorCode("SYN029")!;
  const syn030 = getErrorCode("SYN030")!;
  const syn031 = getErrorCode("SYN031")!;
  const syn032 = getErrorCode("SYN032")!;
  const syn033 = getErrorCode("SYN033")!;
  const syn034 = getErrorCode("SYN034")!;
  const syn035 = getErrorCode("SYN035")!;
  const syn036 = getErrorCode("SYN036")!;
  const syn037 = getErrorCode("SYN037")!;
  const syn038 = getErrorCode("SYN038")!;
  const syn039 = getErrorCode("SYN039")!;
  const syn040 = getErrorCode("SYN040")!;
  const syn041 = getErrorCode("SYN041")!;
  const syn042 = getErrorCode("SYN042")!;
  const syn043 = getErrorCode("SYN043")!;
  const syn044 = getErrorCode("SYN044")!;
  const syn045 = getErrorCode("SYN045")!;
  const syn046 = getErrorCode("SYN046")!;
  const syn047 = getErrorCode("SYN047")!;
  const syn048 = getErrorCode("SYN048")!;
  const syn049 = getErrorCode("SYN049")!;
  const syn050 = getErrorCode("SYN050")!;
  const syn051 = getErrorCode("SYN051")!;
  const syn052 = getErrorCode("SYN052")!;
  const syn053 = getErrorCode("SYN053")!;
  const syn054 = getErrorCode("SYN054")!;
  const syn055 = getErrorCode("SYN055")!;
  const syn056 = getErrorCode("SYN056")!;

  // Collect char-offset ranges where all SYN checks are suppressed:
  // 1. `unsafe "reason" { ... }` expression blocks — explicit acknowledgment.
  // 2. `unsafe "reason" fn` bodies — the entire body is exempt, including any
  //    non-unsafe nested fns declared inside it (matching uns-check's pattern).
  const unsafeRanges = collectUnsafeBlockRanges(tokens);
  for (const { decl } of program.fns) {
    if (decl.unsafeReason !== undefined) {
      unsafeRanges.push({ start: decl.body.start, end: decl.body.end });
    }
  }

  // SYN044/SYN045: pre-pass — collect module-scope aliases.
  // Only module-scope (outside any fn body) to avoid shadowing false positives:
  // if `const f = fetch` is at module level and `fn run() { const f = x; f() }` exists,
  // flagging `f()` inside run() would be wrong because the inner binding shadows the alias.
  const fnBodyCharRanges = program.fns.map((f) => ({ start: f.decl.body.start, end: f.decl.body.end }));
  // Header ranges cover the fn signature (parameter list + return type annotation) from the fn
  // keyword to the body opener `{`. Used by SYN051/SYN052 to avoid treating default-parameter
  // aliases (`fn run(f = fetch)`) as module-scope assignment aliases.
  const fnHeaderCharRanges = program.fns.map((f) => ({ start: f.decl.start, end: f.decl.body.start }));
  const guardedGlobalAliases = new Map<string, string>(); // alias name → original guarded global (SYN044)
  const receiverAliases = new Map<string, string>();       // alias name → original receiver global (SYN045)
  const renamedDestructAliases = new Map<string, { original: string; receiver: string }>(); // SYN046
  for (let ai = 0; ai < tokens.length; ai++) {
    const atok = tokens[ai];
    if (!atok || atok.kind !== "ident") continue;
    if (atok.text !== "const" && atok.text !== "let" && atok.text !== "var") continue;
    // Module-scope only: skip if this token is inside any fn body.
    if (fnBodyCharRanges.some((r) => atok.start >= r.start && atok.start < r.end)) continue;
    // Next: binding name (plain ident — skip destructuring).
    const nameAi = nextSignificant(tokens, ai + 1);
    const nameTokA = tokens[nameAi];
    if (!nameTokA || nameTokA.kind !== "ident") continue;
    // Next: `=` assignment.
    const eqAi = nextSignificant(tokens, nameAi + 1);
    const eqTokA = tokens[eqAi];
    if (!eqTokA || eqTokA.kind !== "eq") continue;
    // RHS: must be a bare ident (no call, no member access on it).
    const rhsAi = nextSignificant(tokens, eqAi + 1);
    const rhsTokA = tokens[rhsAi];
    if (!rhsTokA || rhsTokA.kind !== "ident") continue;
    const afterRhsAi = nextSignificant(tokens, rhsAi + 1);
    const afterRhsA = tokens[afterRhsAi];
    if (afterRhsA && afterRhsA.kind === "punct" && afterRhsA.text === ".") continue;
    if (afterRhsA && afterRhsA.kind === "questionDot") continue;
    if (afterRhsA && afterRhsA.kind === "open" && afterRhsA.text === "(") continue;
    if (SYN037_GUARDED_GLOBALS.has(rhsTokA.text)) {
      guardedGlobalAliases.set(nameTokA.text, rhsTokA.text);
    }
    if (SYN045_RECEIVER_GLOBALS.has(rhsTokA.text)) {
      receiverAliases.set(nameTokA.text, rhsTokA.text);
    }
  }

  // SYN051/SYN052: pre-pass — collect module-scope assignment-expression aliases.
  // SYN044/SYN045 cover the `const/let/var <alias> = <guarded>` declaration form.
  // SYN051/SYN052 close the bare assignment-expression gap: `let f; f = fetch`.
  // Pattern: `<ident> = <guarded>` at module scope, not preceded by `const`/`let`/`var`
  // (declaration — already SYN044/SYN045) or `.`/`?.` (member write — not a local alias).
  const guardedGlobalAssignAliases51 = new Map<string, string>(); // alias → guarded global (SYN051)
  const receiverAssignAliases52 = new Map<string, string>();       // alias → receiver global (SYN052)
  for (let ai = 0; ai < tokens.length; ai++) {
    const atok = tokens[ai];
    if (!atok || atok.kind !== "ident") continue;
    // Module-scope only: skip if inside any fn body or fn header (parameter list / return type).
    if (fnBodyCharRanges.some((r) => atok.start >= r.start && atok.start < r.end)) continue;
    if (fnHeaderCharRanges.some((r) => atok.start >= r.start && atok.start < r.end)) continue;
    // Next must be `=` (eq — not `==`, `===`, `+=`, etc.)
    const eqAi51 = nextSignificant(tokens, ai + 1);
    const eqTok51 = tokens[eqAi51];
    if (!eqTok51 || eqTok51.kind !== "eq") continue;
    // Skip if this is a `const/let/var <ident> = ...` declaration (SYN044/SYN045 handles it).
    const prevAi51 = prevSignificant(tokens, ai - 1);
    const prevTok51 = tokens[prevAi51];
    if (prevTok51 && prevTok51.kind === "ident" &&
        (prevTok51.text === "const" || prevTok51.text === "let" || prevTok51.text === "var")) continue;
    // Skip member-write LHS: `obj.f = fetch` (preceded by `.` or `?.`).
    if (prevTok51 && ((prevTok51.kind === "punct" && prevTok51.text === ".") || prevTok51.kind === "questionDot")) continue;
    // Skip subscript-write LHS: `arr[0] = fetch` (preceded by `]`).
    if (prevTok51 && prevTok51.kind === "close" && prevTok51.text === "]") continue;
    // RHS: must be a bare guarded/receiver ident (no call, no member access on it).
    const rhsAi51 = nextSignificant(tokens, eqAi51 + 1);
    const rhsTok51 = tokens[rhsAi51];
    if (!rhsTok51 || rhsTok51.kind !== "ident") continue;
    const afterRhsAi51 = nextSignificant(tokens, rhsAi51 + 1);
    const afterRhs51 = tokens[afterRhsAi51];
    if (afterRhs51 && afterRhs51.kind === "punct" && afterRhs51.text === ".") continue;
    if (afterRhs51 && afterRhs51.kind === "questionDot") continue;
    if (afterRhs51 && afterRhs51.kind === "open" && afterRhs51.text === "(") continue;
    // Only track if SYN044/SYN045 didn't already capture this alias via declaration.
    if (SYN037_GUARDED_GLOBALS.has(rhsTok51.text) && !guardedGlobalAliases.has(atok.text)) {
      guardedGlobalAssignAliases51.set(atok.text, rhsTok51.text);
    }
    if (SYN045_RECEIVER_GLOBALS.has(rhsTok51.text) && !receiverAliases.has(atok.text)) {
      receiverAssignAliases52.set(atok.text, rhsTok51.text);
    }
  }

  // SYN046: pre-pass — collect module-scope destructuring renames of guarded globals.
  // Detects: const { fetch: req } = globalThis  →  calling req() bypasses SYN007+SYN044.
  // Only tracks renamed properties (colon form); non-renamed const { fetch } = globalThis
  // is not a bypass because calling fetch() still fires SYN007 on the canonical token.
  for (let ai = 0; ai < tokens.length; ai++) {
    const atok = tokens[ai];
    if (!atok || atok.kind !== "ident") continue;
    if (atok.text !== "const" && atok.text !== "let" && atok.text !== "var") continue;
    // Module-scope only: skip if inside any fn body.
    if (fnBodyCharRanges.some((r) => atok.start >= r.start && atok.start < r.end)) continue;
    // Next must be `{` — this is a destructuring pattern.
    const braceAi46 = nextSignificant(tokens, ai + 1);
    const braceTok46 = tokens[braceAi46];
    if (!braceTok46 || !(braceTok46.kind === "open" && braceTok46.text === "{")) continue;
    // Find matching `}` via matchedAt.
    const closeBraceIdx46 = braceTok46.matchedAt;
    if (closeBraceIdx46 === undefined) continue;
    // After `}`: must be `=`.
    const eqAi46 = nextSignificant(tokens, closeBraceIdx46 + 1);
    const eqTok46 = tokens[eqAi46];
    if (!eqTok46 || eqTok46.kind !== "eq") continue;
    // RHS: must be a bare global-receiver ident.
    const rhsAi46 = nextSignificant(tokens, eqAi46 + 1);
    const rhsTok46 = tokens[rhsAi46];
    if (!rhsTok46 || rhsTok46.kind !== "ident") continue;
    if (!SYN045_RECEIVER_GLOBALS.has(rhsTok46.text)) continue;
    // Scan inside `{ ... }` for `guardedGlobal : alias` rename pairs.
    for (let di = braceAi46 + 1; di < closeBraceIdx46; di++) {
      const dtok = tokens[di];
      if (!dtok || dtok.kind !== "ident") continue;
      if (!SYN037_GUARDED_GLOBALS.has(dtok.text)) continue;
      // Check for `: alias` rename (object destructuring rename form).
      const colonAi46 = nextSignificant(tokens, di + 1);
      const colonTok46 = tokens[colonAi46];
      if (!colonTok46 || !(colonTok46.kind === "punct" && colonTok46.text === ":")) continue;
      const aliasAi46 = nextSignificant(tokens, colonAi46 + 1);
      const aliasTok46 = tokens[aliasAi46];
      if (!aliasTok46 || aliasTok46.kind !== "ident") continue;
      renamedDestructAliases.set(aliasTok46.text, { original: dtok.text, receiver: rhsTok46.text });
      di = aliasAi46;
    }
  }

  // SYN048: pre-pass — collect fn-body-local aliases of guarded globals.
  // SYN044 only covers module-scope aliases; `const req = fetch` declared inside a fn body
  // is not tracked there (shadowing false-positive risk was cited for module-scope pre-pass,
  // but per-fn-body tracking avoids that entirely because we scope to each fn individually).
  const localGuardedAliases48 = new Map<
    (typeof program.fns)[0]["decl"],
    Map<string, string>
  >();
  for (const { decl } of program.fns) {
    if (decl.unsafeReason !== undefined) continue;
    const bodyStart48 = decl.bodyTokenStart ?? decl.tokenStart;
    // Find all nested fn char-ranges within this decl so we skip their tokens.
    const nestedRanges48 = program.fns
      .filter(
        (f) =>
          f.decl !== decl &&
          f.decl.body.start >= decl.body.start &&
          f.decl.body.end <= decl.body.end,
      )
      .map((f) => ({ start: f.decl.body.start, end: f.decl.body.end }));
    const localAliases48 = new Map<string, string>();
    for (let ai = bodyStart48; ai < decl.tokenEnd; ai++) {
      const atok = tokens[ai];
      if (!atok) continue;
      // Skip tokens inside nested fn bodies.
      if (nestedRanges48.some((r) => atok.start >= r.start && atok.start < r.end)) continue;
      if (atok.kind !== "ident") continue;
      if (atok.text !== "const" && atok.text !== "let" && atok.text !== "var") continue;
      // Next: binding name (plain ident — skip destructuring).
      const nameAi48 = nextSignificant(tokens, ai + 1);
      const nameTok48 = tokens[nameAi48];
      if (!nameTok48 || nameTok48.kind !== "ident") continue;
      // Next: `=`.
      const eqAi48 = nextSignificant(tokens, nameAi48 + 1);
      const eqTok48 = tokens[eqAi48];
      if (!eqTok48 || eqTok48.kind !== "eq") continue;
      // RHS: bare guarded-global ident (no call, no member access).
      const rhsAi48 = nextSignificant(tokens, eqAi48 + 1);
      const rhsTok48 = tokens[rhsAi48];
      if (!rhsTok48 || rhsTok48.kind !== "ident") continue;
      if (!SYN037_GUARDED_GLOBALS.has(rhsTok48.text)) continue;
      const afterRhs48Ai = nextSignificant(tokens, rhsAi48 + 1);
      const afterRhs48 = tokens[afterRhs48Ai];
      if (afterRhs48 && afterRhs48.kind === "punct" && afterRhs48.text === ".") continue;
      if (afterRhs48 && afterRhs48.kind === "questionDot") continue;
      if (afterRhs48 && afterRhs48.kind === "open" && afterRhs48.text === "(") continue;
      localAliases48.set(nameTok48.text, rhsTok48.text);
    }
    if (localAliases48.size > 0) {
      localGuardedAliases48.set(decl, localAliases48);
    }
  }

  // SYN049: pre-pass — collect fn-body-local aliases of global receiver objects.
  // SYN045 covers module-scope receiver aliases; `const g = globalThis` declared inside a fn body
  // is not tracked there. Per-fn-body tracking avoids shadowing false-positives.
  const localReceiverAliases49 = new Map<
    (typeof program.fns)[0]["decl"],
    Map<string, string>
  >();
  for (const { decl } of program.fns) {
    if (decl.unsafeReason !== undefined) continue;
    const bodyStart49 = decl.bodyTokenStart ?? decl.tokenStart;
    const nestedRanges49 = program.fns
      .filter(
        (f) =>
          f.decl !== decl &&
          f.decl.body.start >= decl.body.start &&
          f.decl.body.end <= decl.body.end,
      )
      .map((f) => ({ start: f.decl.body.start, end: f.decl.body.end }));
    const localReceiver49 = new Map<string, string>();
    for (let ai = bodyStart49; ai < decl.tokenEnd; ai++) {
      const atok = tokens[ai];
      if (!atok) continue;
      if (nestedRanges49.some((r) => atok.start >= r.start && atok.start < r.end)) continue;
      if (atok.kind !== "ident") continue;
      if (atok.text !== "const" && atok.text !== "let" && atok.text !== "var") continue;
      const nameAi49 = nextSignificant(tokens, ai + 1);
      const nameTok49 = tokens[nameAi49];
      if (!nameTok49 || nameTok49.kind !== "ident") continue;
      const eqAi49 = nextSignificant(tokens, nameAi49 + 1);
      const eqTok49 = tokens[eqAi49];
      if (!eqTok49 || eqTok49.kind !== "eq") continue;
      const rhsAi49 = nextSignificant(tokens, eqAi49 + 1);
      const rhsTok49 = tokens[rhsAi49];
      if (!rhsTok49 || rhsTok49.kind !== "ident") continue;
      if (!SYN045_RECEIVER_GLOBALS.has(rhsTok49.text)) continue;
      // Exclude member access on RHS (const g = obj.globalThis)
      const afterRhs49Ai = nextSignificant(tokens, rhsAi49 + 1);
      const afterRhs49 = tokens[afterRhs49Ai];
      if (afterRhs49 && afterRhs49.kind === "punct" && afterRhs49.text === ".") continue;
      if (afterRhs49 && afterRhs49.kind === "questionDot") continue;
      localReceiver49.set(nameTok49.text, rhsTok49.text);
    }
    if (localReceiver49.size > 0) {
      localReceiverAliases49.set(decl, localReceiver49);
    }
  }

  // SYN050: pre-pass — collect fn-body-local destructuring renames of guarded globals.
  // SYN046 covers module-scope destructuring renames; fn-body destructuring is not tracked there.
  // Detects: const { fetch: req } = globalThis inside a fn body → calling req() bypasses SYN007+SYN046.
  const localDestructAliases50 = new Map<
    (typeof program.fns)[0]["decl"],
    Map<string, { original: string; receiver: string }>
  >();
  for (const { decl } of program.fns) {
    if (decl.unsafeReason !== undefined) continue;
    const bodyStart50 = decl.bodyTokenStart ?? decl.tokenStart;
    const bodyEnd50 = decl.tokenEnd;
    const nestedRanges50 = program.fns
      .filter(
        (f) =>
          f.decl !== decl &&
          f.decl.body.start >= decl.body.start &&
          f.decl.body.end <= decl.body.end,
      )
      .map((f) => ({ start: f.decl.body.start, end: f.decl.body.end }));
    const localDestruct50 = new Map<string, { original: string; receiver: string }>();
    for (let ai = bodyStart50; ai < bodyEnd50; ai++) {
      const atok = tokens[ai];
      if (!atok) continue;
      if (nestedRanges50.some((r) => atok.start >= r.start && atok.start < r.end)) continue;
      if (atok.kind !== "ident") continue;
      if (atok.text !== "const" && atok.text !== "let" && atok.text !== "var") continue;
      // Next must be `{` — destructuring pattern.
      const braceAi50 = nextSignificant(tokens, ai + 1);
      const braceTok50 = tokens[braceAi50];
      if (!braceTok50 || !(braceTok50.kind === "open" && braceTok50.text === "{")) continue;
      const closeBraceIdx50 = braceTok50.matchedAt;
      if (closeBraceIdx50 === undefined) continue;
      // After `}`: must be `=`.
      const eqAi50 = nextSignificant(tokens, closeBraceIdx50 + 1);
      const eqTok50 = tokens[eqAi50];
      if (!eqTok50 || eqTok50.kind !== "eq") continue;
      // RHS: must be a bare global-receiver ident.
      const rhsAi50 = nextSignificant(tokens, eqAi50 + 1);
      const rhsTok50 = tokens[rhsAi50];
      if (!rhsTok50 || rhsTok50.kind !== "ident") continue;
      if (!SYN045_RECEIVER_GLOBALS.has(rhsTok50.text)) continue;
      // Scan inside `{ ... }` for `guardedGlobal : alias` rename pairs.
      for (let di = braceAi50 + 1; di < closeBraceIdx50; di++) {
        const dtok = tokens[di];
        if (!dtok || dtok.kind !== "ident") continue;
        if (!SYN037_GUARDED_GLOBALS.has(dtok.text)) continue;
        const colonAi50 = nextSignificant(tokens, di + 1);
        const colonTok50 = tokens[colonAi50];
        if (!colonTok50 || !(colonTok50.kind === "punct" && colonTok50.text === ":")) continue;
        const aliasAi50 = nextSignificant(tokens, colonAi50 + 1);
        const aliasTok50 = tokens[aliasAi50];
        if (!aliasTok50 || aliasTok50.kind !== "ident") continue;
        localDestruct50.set(aliasTok50.text, { original: dtok.text, receiver: rhsTok50.text });
        di = aliasAi50;
      }
    }
    if (localDestruct50.size > 0) {
      localDestructAliases50.set(decl, localDestruct50);
    }
  }

  // SYN053: pre-pass — collect fn-body assignment-expression aliases of guarded globals.
  // SYN048 covers `const/let/var f = fetch` declarations inside fn bodies.
  // SYN051 covers module-scope assignment-expression aliases (`let f; f = fetch` at module level).
  // SYN053 closes the remaining gap: bare assignment expressions inside fn bodies (`f = fetch`).
  const localGuardedAssignAliases53 = new Map<
    (typeof program.fns)[0]["decl"],
    Map<string, string>
  >();
  for (const { decl } of program.fns) {
    if (decl.unsafeReason !== undefined) continue;
    const bodyStart53 = decl.bodyTokenStart ?? decl.tokenStart;
    const bodyEnd53 = decl.tokenEnd;
    const nestedRanges53 = program.fns
      .filter(
        (f) =>
          f.decl !== decl &&
          f.decl.body.start >= decl.body.start &&
          f.decl.body.end <= decl.body.end,
      )
      .map((f) => ({ start: f.decl.body.start, end: f.decl.body.end }));
    const localAssignAliases53 = new Map<string, string>();
    for (let ai = bodyStart53; ai < bodyEnd53; ai++) {
      const atok = tokens[ai];
      if (!atok || atok.kind !== "ident") continue;
      if (nestedRanges53.some((r) => atok.start >= r.start && atok.start < r.end)) continue;
      // Next must be `=` (not `==`, `===`, `+=`, etc.)
      const eqAi53 = nextSignificant(tokens, ai + 1);
      const eqTok53 = tokens[eqAi53];
      if (!eqTok53 || eqTok53.kind !== "eq") continue;
      // Skip if preceded by `const`/`let`/`var` (SYN048 handles declaration form).
      const prevAi53 = prevSignificant(tokens, ai - 1);
      const prevTok53 = tokens[prevAi53];
      if (prevTok53 && prevTok53.kind === "ident" &&
          (prevTok53.text === "const" || prevTok53.text === "let" || prevTok53.text === "var")) continue;
      // Skip member-write LHS: `obj.f = fetch` (preceded by `.` or `?.`).
      if (prevTok53 && ((prevTok53.kind === "punct" && prevTok53.text === ".") || prevTok53.kind === "questionDot")) continue;
      // Skip subscript-write LHS: `arr[0] = fetch` (preceded by `]`).
      if (prevTok53 && prevTok53.kind === "close" && prevTok53.text === "]") continue;
      // RHS: must be a bare guarded-global ident (no call, no member access).
      const rhsAi53 = nextSignificant(tokens, eqAi53 + 1);
      const rhsTok53 = tokens[rhsAi53];
      if (!rhsTok53 || rhsTok53.kind !== "ident") continue;
      if (!SYN037_GUARDED_GLOBALS.has(rhsTok53.text)) continue;
      const afterRhsAi53 = nextSignificant(tokens, rhsAi53 + 1);
      const afterRhs53 = tokens[afterRhsAi53];
      if (afterRhs53 && afterRhs53.kind === "punct" && afterRhs53.text === ".") continue;
      if (afterRhs53 && afterRhs53.kind === "questionDot") continue;
      if (afterRhs53 && afterRhs53.kind === "open" && afterRhs53.text === "(") continue;
      // Only track if SYN048 didn't already capture this alias via declaration.
      const fnLocalAliases48ForDecl = localGuardedAliases48.get(decl);
      if (!fnLocalAliases48ForDecl || !fnLocalAliases48ForDecl.has(atok.text)) {
        localAssignAliases53.set(atok.text, rhsTok53.text);
      }
    }
    if (localAssignAliases53.size > 0) {
      localGuardedAssignAliases53.set(decl, localAssignAliases53);
    }
  }

  // SYN054: pre-pass — collect fn-body assignment-expression aliases of global receiver objects.
  // SYN049 covers `const/let/var g = globalThis` declarations inside fn bodies.
  // SYN052 covers module-scope assignment-expression aliases (`let g; g = globalThis` at module level).
  // SYN054 closes the remaining gap: bare assignment expressions inside fn bodies (`g = globalThis`).
  const localReceiverAssignAliases54 = new Map<
    (typeof program.fns)[0]["decl"],
    Map<string, string>
  >();
  for (const { decl } of program.fns) {
    if (decl.unsafeReason !== undefined) continue;
    const bodyStart54 = decl.bodyTokenStart ?? decl.tokenStart;
    const bodyEnd54 = decl.tokenEnd;
    const nestedRanges54 = program.fns
      .filter(
        (f) =>
          f.decl !== decl &&
          f.decl.body.start >= decl.body.start &&
          f.decl.body.end <= decl.body.end,
      )
      .map((f) => ({ start: f.decl.body.start, end: f.decl.body.end }));
    const localReceiverAssign54 = new Map<string, string>();
    for (let ai = bodyStart54; ai < bodyEnd54; ai++) {
      const atok = tokens[ai];
      if (!atok || atok.kind !== "ident") continue;
      if (nestedRanges54.some((r) => atok.start >= r.start && atok.start < r.end)) continue;
      const eqAi54 = nextSignificant(tokens, ai + 1);
      const eqTok54 = tokens[eqAi54];
      if (!eqTok54 || eqTok54.kind !== "eq") continue;
      const prevAi54 = prevSignificant(tokens, ai - 1);
      const prevTok54 = tokens[prevAi54];
      if (prevTok54 && prevTok54.kind === "ident" &&
          (prevTok54.text === "const" || prevTok54.text === "let" || prevTok54.text === "var")) continue;
      if (prevTok54 && ((prevTok54.kind === "punct" && prevTok54.text === ".") || prevTok54.kind === "questionDot")) continue;
      if (prevTok54 && prevTok54.kind === "close" && prevTok54.text === "]") continue;
      const rhsAi54 = nextSignificant(tokens, eqAi54 + 1);
      const rhsTok54 = tokens[rhsAi54];
      if (!rhsTok54 || rhsTok54.kind !== "ident") continue;
      if (!SYN045_RECEIVER_GLOBALS.has(rhsTok54.text)) continue;
      const afterRhsAi54 = nextSignificant(tokens, rhsAi54 + 1);
      const afterRhs54 = tokens[afterRhsAi54];
      if (afterRhs54 && afterRhs54.kind === "punct" && afterRhs54.text === ".") continue;
      if (afterRhs54 && afterRhs54.kind === "questionDot") continue;
      // Only track if SYN049 didn't already capture this via declaration.
      const fnLocalReceiver49ForDecl = localReceiverAliases49.get(decl);
      if (!fnLocalReceiver49ForDecl || !fnLocalReceiver49ForDecl.has(atok.text)) {
        localReceiverAssign54.set(atok.text, rhsTok54.text);
      }
    }
    if (localReceiverAssign54.size > 0) {
      localReceiverAssignAliases54.set(decl, localReceiverAssign54);
    }
  }

  // SYN055: pre-pass — collect default-parameter aliases of guarded globals.
  // The parameter list (before bodyTokenStart) is never scanned by SYN048/SYN053 pre-passes,
  // which start from bodyTokenStart. `fn run(f = fetch)` assigns fetch to f as a default value;
  // when f(url) is called in the body SYN007 does not fire. SYN055 closes this gap.
  const defaultParamGuardedAliases55 = new Map<
    (typeof program.fns)[0]["decl"],
    Map<string, string>
  >();
  for (const { decl } of program.fns) {
    if (decl.unsafeReason !== undefined) continue;
    const paramEnd55 = decl.bodyTokenStart ?? decl.tokenStart;
    const defaultAliases55 = new Map<string, string>();
    for (let ai = decl.tokenStart; ai < paramEnd55; ai++) {
      const atok = tokens[ai];
      if (!atok || atok.kind !== "ident") continue;
      const eqAi55 = nextSignificant(tokens, ai + 1);
      const eqTok55 = tokens[eqAi55];
      if (!eqTok55 || eqTok55.kind !== "eq") continue;
      // Skip if preceded by `const`/`let`/`var` (not valid in param lists, but defensive).
      const prevAi55 = prevSignificant(tokens, ai - 1);
      const prevTok55 = tokens[prevAi55];
      if (prevTok55 && prevTok55.kind === "ident" &&
          (prevTok55.text === "const" || prevTok55.text === "let" || prevTok55.text === "var")) continue;
      // Skip member-write LHS: preceded by `.` or `?.`.
      if (prevTok55 && ((prevTok55.kind === "punct" && prevTok55.text === ".") || prevTok55.kind === "questionDot")) continue;
      // RHS must be a bare guarded-global ident (no call, no member access).
      const rhsAi55 = nextSignificant(tokens, eqAi55 + 1);
      const rhsTok55 = tokens[rhsAi55];
      if (!rhsTok55 || rhsTok55.kind !== "ident") continue;
      if (!SYN037_GUARDED_GLOBALS.has(rhsTok55.text)) continue;
      const afterRhsAi55 = nextSignificant(tokens, rhsAi55 + 1);
      const afterRhs55 = tokens[afterRhsAi55];
      if (afterRhs55 && afterRhs55.kind === "punct" && afterRhs55.text === ".") continue;
      if (afterRhs55 && afterRhs55.kind === "questionDot") continue;
      if (afterRhs55 && afterRhs55.kind === "open" && afterRhs55.text === "(") continue;
      defaultAliases55.set(atok.text, rhsTok55.text);
    }
    if (defaultAliases55.size > 0) {
      defaultParamGuardedAliases55.set(decl, defaultAliases55);
    }
  }

  // SYN056: pre-pass — collect default-parameter aliases of global receiver objects.
  // `fn run(g = globalThis)` assigns globalThis to g; g.fetch(url) bypasses SYN041 because
  // the receiver token is g, not globalThis. SYN056 closes this gap.
  const defaultParamReceiverAliases56 = new Map<
    (typeof program.fns)[0]["decl"],
    Map<string, string>
  >();
  for (const { decl } of program.fns) {
    if (decl.unsafeReason !== undefined) continue;
    const paramEnd56 = decl.bodyTokenStart ?? decl.tokenStart;
    const receiverAliases56 = new Map<string, string>();
    for (let ai = decl.tokenStart; ai < paramEnd56; ai++) {
      const atok = tokens[ai];
      if (!atok || atok.kind !== "ident") continue;
      const eqAi56 = nextSignificant(tokens, ai + 1);
      const eqTok56 = tokens[eqAi56];
      if (!eqTok56 || eqTok56.kind !== "eq") continue;
      const prevAi56 = prevSignificant(tokens, ai - 1);
      const prevTok56 = tokens[prevAi56];
      if (prevTok56 && prevTok56.kind === "ident" &&
          (prevTok56.text === "const" || prevTok56.text === "let" || prevTok56.text === "var")) continue;
      if (prevTok56 && ((prevTok56.kind === "punct" && prevTok56.text === ".") || prevTok56.kind === "questionDot")) continue;
      const rhsAi56 = nextSignificant(tokens, eqAi56 + 1);
      const rhsTok56 = tokens[rhsAi56];
      if (!rhsTok56 || rhsTok56.kind !== "ident") continue;
      if (!SYN045_RECEIVER_GLOBALS.has(rhsTok56.text)) continue;
      const afterRhsAi56 = nextSignificant(tokens, rhsAi56 + 1);
      const afterRhs56 = tokens[afterRhsAi56];
      if (afterRhs56 && afterRhs56.kind === "punct" && afterRhs56.text === ".") continue;
      if (afterRhs56 && afterRhs56.kind === "questionDot") continue;
      if (afterRhs56 && afterRhs56.kind === "open" && afterRhs56.text === "(") continue;
      receiverAliases56.set(atok.text, rhsTok56.text);
    }
    if (receiverAliases56.size > 0) {
      defaultParamReceiverAliases56.set(decl, receiverAliases56);
    }
  }

  const nesting = computeNesting(program.fns.map((f) => f.decl));

  for (const { decl } of program.fns) {
    // An `unsafe "reason" fn` body is an explicit acknowledgment — all SYN checks are skipped.
    // The range-based suppression above also covers nested non-unsafe fns within it,
    // so this early-continue is kept purely as an optimisation.
    if (decl.unsafeReason !== undefined) continue;

    const inner = nesting.get(decl) ?? [];
    const open: typeof inner = [];
    let nextInner = 0;

    const bodyStart = decl.bodyTokenStart ?? decl.tokenStart;
    const fnLocalAliases48 = localGuardedAliases48.get(decl);
    const fnLocalReceiver49 = localReceiverAliases49.get(decl);
    const fnLocalDestruct50 = localDestructAliases50.get(decl);
    const fnLocalAssignAliases53 = localGuardedAssignAliases53.get(decl);
    const fnLocalReceiverAssign54 = localReceiverAssignAliases54.get(decl);
    const fnDefaultParamAliases55 = defaultParamGuardedAliases55.get(decl);
    const fnDefaultParamReceiverAliases56 = defaultParamReceiverAliases56.get(decl);

    // Single dispatch loop: nesting bookkeeping runs once per token position.
    // All SYN checks are dispatched via a switch on tok.text after an ident guard.
    for (let i = bodyStart; i < decl.tokenEnd; i++) {
      while (open.length > 0 && open[open.length - 1]!.tokenEnd <= i) open.pop();
      while (nextInner < inner.length && inner[nextInner]!.tokenStart <= i) {
        open.push(inner[nextInner]!);
        nextInner++;
      }
      if (open.length > 0) continue;

      const tok = tokens[i];
      if (!tok || tok.kind !== "ident") continue;

      // ── SYN044: module-scope guarded-global alias called in fn body ───────
      // Must run BEFORE the switch: the default: case does `continue` for
      // any unrecognised ident, so code after the switch is unreachable for alias names.
      if (guardedGlobalAliases.has(tok.text) && !isInsideRange(tok.start, unsafeRanges)) {
        const nextIdx44 = nextSignificant(tokens, i + 1);
        const next44 = tokens[nextIdx44];
        const isCall44 =
          next44 && (
            (next44.kind === "open" && next44.text === "(") ||
            next44.kind === "questionDot"
          );
        if (isCall44) {
          const prevIdx44 = prevSignificant(tokens, i - 1);
          const prev44 = tokens[prevIdx44];
          const isMemberAccess44 = prev44 && ((prev44.kind === "punct" && prev44.text === ".") || prev44.kind === "questionDot");
          const isDecl44 = prev44 && (
            (prev44.kind === "keyword" && prev44.text === "fn") ||
            (prev44.kind === "ident" && (prev44.text === "function" || prev44.text === "const" || prev44.text === "let" || prev44.text === "var"))
          );
          if (!isMemberAccess44 && !isDecl44) {
            const origGlobal44 = guardedGlobalAliases.get(tok.text)!;
            const loc44 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN044",
              severity: "warning",
              file: null,
              line: loc44.line,
              column: loc44.column,
              start: tok.start,
              end: tok.end,
              message:
                `fn '${decl.name}' calls '${tok.text}()' — '${tok.text}' is a module-scope alias of ` +
                `the guarded global '${origGlobal44}'; calling through the alias bypasses SYN004–SYN043 ` +
                `name-token checks; call '${origGlobal44}' directly so the relevant SYN check fires, ` +
                `or wrap in unsafe "calls ${origGlobal44} via alias for <reason>" { ${tok.text}(...) }`,
              rule: syn044.rule,
              idiom: syn044.idiom,
              rewrite: syn044.rewrite,
            });
          }
        }
      }

      // ── SYN046: module-scope destructuring rename of guarded global called in fn body ──
      // Must run BEFORE the switch for the same reason as SYN044/SYN045.
      if (renamedDestructAliases.has(tok.text) && !isInsideRange(tok.start, unsafeRanges)) {
        const nextIdx46 = nextSignificant(tokens, i + 1);
        const next46 = tokens[nextIdx46];
        const isCall46 =
          next46 && (
            (next46.kind === "open" && next46.text === "(") ||
            next46.kind === "questionDot"
          );
        if (isCall46) {
          const prevIdx46 = prevSignificant(tokens, i - 1);
          const prev46 = tokens[prevIdx46];
          const isMemberAccess46 = prev46 && ((prev46.kind === "punct" && prev46.text === ".") || prev46.kind === "questionDot");
          const isDecl46 = prev46 && (
            (prev46.kind === "keyword" && prev46.text === "fn") ||
            (prev46.kind === "ident" && (prev46.text === "function" || prev46.text === "const" || prev46.text === "let" || prev46.text === "var"))
          );
          if (!isMemberAccess46 && !isDecl46) {
            const info46 = renamedDestructAliases.get(tok.text)!;
            const loc46 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN046",
              severity: "warning",
              file: null,
              line: loc46.line,
              column: loc46.column,
              start: tok.start,
              end: tok.end,
              message:
                `fn '${decl.name}' calls '${tok.text}()' — '${tok.text}' is a module-scope ` +
                `destructuring rename of the guarded global '${info46.original}' (via '${info46.receiver}'); ` +
                `calling through the renamed alias bypasses SYN004–SYN045 name-token checks; ` +
                `call '${info46.original}' or '${info46.receiver}.${info46.original}' directly so the relevant SYN check fires, ` +
                `or wrap in unsafe "calls ${info46.original} via destructuring rename for <reason>" { ${tok.text}(...) }`,
              rule: syn046.rule,
              idiom: syn046.idiom,
              rewrite: syn046.rewrite,
            });
          }
        }
      }

      // ── SYN051: module-scope assignment-expression alias of guarded global called in fn body ──
      // Must run BEFORE the switch for the same reason as SYN044.
      if (guardedGlobalAssignAliases51.has(tok.text) && !isInsideRange(tok.start, unsafeRanges)) {
        const nextIdx51 = nextSignificant(tokens, i + 1);
        const next51 = tokens[nextIdx51];
        const isCall51 =
          next51 && (
            (next51.kind === "open" && next51.text === "(") ||
            next51.kind === "questionDot"
          );
        if (isCall51) {
          const prevIdx51 = prevSignificant(tokens, i - 1);
          const prev51 = tokens[prevIdx51];
          const isMemberAccess51 = prev51 && ((prev51.kind === "punct" && prev51.text === ".") || prev51.kind === "questionDot");
          const isDecl51 = prev51 && (
            (prev51.kind === "keyword" && prev51.text === "fn") ||
            (prev51.kind === "ident" && (prev51.text === "function" || prev51.text === "const" || prev51.text === "let" || prev51.text === "var"))
          );
          if (!isMemberAccess51 && !isDecl51) {
            const origGlobal51 = guardedGlobalAssignAliases51.get(tok.text)!;
            const loc51 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN051",
              severity: "warning",
              file: null,
              line: loc51.line,
              column: loc51.column,
              start: tok.start,
              end: tok.end,
              message:
                `fn '${decl.name}' calls '${tok.text}()' — '${tok.text}' is a module-scope assignment alias of ` +
                `the guarded global '${origGlobal51}' (set via assignment expression, not a declaration); ` +
                `calling through the alias bypasses SYN004–SYN050 name-token checks; ` +
                `call '${origGlobal51}' directly so the relevant SYN check fires, ` +
                `or wrap in unsafe "calls ${origGlobal51} via assignment alias for <reason>" { ${tok.text}(...) }`,
              rule: syn051.rule,
              idiom: syn051.idiom,
              rewrite: syn051.rewrite,
            });
          }
        }
      }

      // ── SYN048: fn-body-local alias of guarded global called in same fn body ──────
      // Must run BEFORE the switch: the default: case does `continue` for any
      // unrecognised ident, so code after the switch is unreachable for alias names.
      if (fnLocalAliases48 && fnLocalAliases48.has(tok.text) && !isInsideRange(tok.start, unsafeRanges)) {
        const nextIdx48 = nextSignificant(tokens, i + 1);
        const next48 = tokens[nextIdx48];
        const isCall48 =
          next48 &&
          ((next48.kind === "open" && next48.text === "(") || next48.kind === "questionDot");
        if (isCall48) {
          const prevIdx48 = prevSignificant(tokens, i - 1);
          const prev48 = tokens[prevIdx48];
          const isMemberAccess48 =
            prev48 &&
            ((prev48.kind === "punct" && prev48.text === ".") || prev48.kind === "questionDot");
          const isDecl48 =
            prev48 &&
            ((prev48.kind === "keyword" && prev48.text === "fn") ||
              (prev48.kind === "ident" &&
                (prev48.text === "function" ||
                  prev48.text === "const" ||
                  prev48.text === "let" ||
                  prev48.text === "var")));
          if (!isMemberAccess48 && !isDecl48) {
            const origGlobal48 = fnLocalAliases48.get(tok.text)!;
            const loc48 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN048",
              severity: "warning",
              file: null,
              line: loc48.line,
              column: loc48.column,
              start: tok.start,
              end: tok.end,
              message:
                `fn '${decl.name}' calls '${tok.text}()' — '${tok.text}' is a local alias of ` +
                `the guarded global '${origGlobal48}' defined in this fn body; calling through the alias ` +
                `bypasses SYN004–SYN047 name-token checks; call '${origGlobal48}' directly so the relevant ` +
                `SYN check fires, or wrap in unsafe "calls ${origGlobal48} via local alias for <reason>" { ${tok.text}(...) }`,
              rule: syn048.rule,
              idiom: syn048.idiom,
              rewrite: syn048.rewrite,
            });
          }
        }
      }

      // ── SYN049: fn-body-local receiver alias used as member-access receiver ──────
      // Must run BEFORE the switch for the same reason as SYN048.
      if (fnLocalReceiver49 && fnLocalReceiver49.has(tok.text) && !isInsideRange(tok.start, unsafeRanges)) {
        const nextIdx49 = nextSignificant(tokens, i + 1);
        const next49 = tokens[nextIdx49];
        const isDot49 = next49 && next49.kind === "punct" && next49.text === ".";
        const isOptChain49 = next49 && next49.kind === "questionDot";
        if (isDot49 || isOptChain49) {
          const prevIdx49 = prevSignificant(tokens, i - 1);
          const prev49 = tokens[prevIdx49];
          const isMemberTarget49 = prev49 && ((prev49.kind === "punct" && prev49.text === ".") || prev49.kind === "questionDot");
          if (!isMemberTarget49) {
            const memberIdx49 = nextSignificant(tokens, nextIdx49 + 1);
            const memberTok49 = tokens[memberIdx49];
            if (memberTok49 && memberTok49.kind === "ident" && SYN041_DANGEROUS_MEMBERS.has(memberTok49.text)) {
              const origReceiver49 = fnLocalReceiver49.get(tok.text)!;
              const sep49 = isOptChain49 ? "?." : ".";
              const loc49 = locationOf(src, tok.start);
              warnings.push({
                code: "SYN049",
                severity: "warning",
                file: null,
                line: loc49.line,
                column: loc49.column,
                start: tok.start,
                end: memberTok49.end,
                message:
                  `fn '${decl.name}' accesses ${tok.text}${sep49}${memberTok49.text} — '${tok.text}' is a ` +
                  `fn-body-local alias of the global receiver '${origReceiver49}' defined in this fn body; ` +
                  `the alias is not in the SYN041 receiver watch-list, so '${tok.text}${sep49}${memberTok49.text}' ` +
                  `bypasses SYN041–SYN048; access '${origReceiver49}${sep49}${memberTok49.text}' directly so SYN041 fires, ` +
                  `or wrap in unsafe "uses ${memberTok49.text} via aliased ${origReceiver49} for <reason>" { ${tok.text}${sep49}${memberTok49.text} }`,
                rule: syn049.rule,
                idiom: syn049.idiom,
                rewrite: syn049.rewrite,
              });
            }
          }
        }
      }

      // ── SYN050: fn-body-local destructuring rename of guarded global called in same fn body ──
      // Must run BEFORE the switch for the same reason as SYN048.
      if (fnLocalDestruct50 && fnLocalDestruct50.has(tok.text) && !isInsideRange(tok.start, unsafeRanges)) {
        const nextIdx50 = nextSignificant(tokens, i + 1);
        const next50 = tokens[nextIdx50];
        const isCall50 =
          next50 &&
          ((next50.kind === "open" && next50.text === "(") || next50.kind === "questionDot");
        if (isCall50) {
          const prevIdx50 = prevSignificant(tokens, i - 1);
          const prev50 = tokens[prevIdx50];
          const isMemberAccess50 =
            prev50 &&
            ((prev50.kind === "punct" && prev50.text === ".") || prev50.kind === "questionDot");
          const isDecl50 =
            prev50 &&
            ((prev50.kind === "keyword" && prev50.text === "fn") ||
              (prev50.kind === "ident" &&
                (prev50.text === "function" ||
                  prev50.text === "const" ||
                  prev50.text === "let" ||
                  prev50.text === "var")));
          if (!isMemberAccess50 && !isDecl50) {
            const info50 = fnLocalDestruct50.get(tok.text)!;
            const loc50 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN050",
              severity: "warning",
              file: null,
              line: loc50.line,
              column: loc50.column,
              start: tok.start,
              end: tok.end,
              message:
                `fn '${decl.name}' calls '${tok.text}()' — '${tok.text}' is a fn-body-local destructuring ` +
                `rename of '${info50.original}' from '${info50.receiver}' defined in this fn body; calling ` +
                `through the alias bypasses SYN004–SYN049 name-token checks; call '${info50.original}' directly ` +
                `so the relevant SYN check fires, or wrap in ` +
                `unsafe "calls ${info50.original} via destructured alias for <reason>" { ${tok.text}(...) }`,
              rule: syn050.rule,
              idiom: syn050.idiom,
              rewrite: syn050.rewrite,
            });
          }
        }
      }

      // ── SYN053: fn-body assignment-expression alias of guarded global called in same fn body ──
      // Must run BEFORE the switch for the same reason as SYN048.
      if (fnLocalAssignAliases53 && fnLocalAssignAliases53.has(tok.text) && !isInsideRange(tok.start, unsafeRanges)) {
        const nextIdx53 = nextSignificant(tokens, i + 1);
        const next53 = tokens[nextIdx53];
        const isCall53 =
          next53 &&
          ((next53.kind === "open" && next53.text === "(") || next53.kind === "questionDot");
        if (isCall53) {
          const prevIdx53 = prevSignificant(tokens, i - 1);
          const prev53 = tokens[prevIdx53];
          const isMemberAccess53 =
            prev53 &&
            ((prev53.kind === "punct" && prev53.text === ".") || prev53.kind === "questionDot");
          const isDecl53 =
            prev53 &&
            ((prev53.kind === "keyword" && prev53.text === "fn") ||
              (prev53.kind === "ident" &&
                (prev53.text === "function" ||
                  prev53.text === "const" ||
                  prev53.text === "let" ||
                  prev53.text === "var")));
          if (!isMemberAccess53 && !isDecl53) {
            const origGlobal53 = fnLocalAssignAliases53.get(tok.text)!;
            const loc53 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN053",
              severity: "warning",
              file: null,
              line: loc53.line,
              column: loc53.column,
              start: tok.start,
              end: tok.end,
              message:
                `fn '${decl.name}' calls '${tok.text}()' — '${tok.text}' is a fn-body assignment alias of ` +
                `the guarded global '${origGlobal53}' (set via assignment expression inside this fn body, not a declaration); ` +
                `calling through the alias bypasses SYN004–SYN052 name-token checks; ` +
                `call '${origGlobal53}' directly so the relevant SYN check fires, ` +
                `or wrap in unsafe "calls ${origGlobal53} via assignment alias for <reason>" { ${tok.text}(...) }`,
              rule: syn053.rule,
              idiom: syn053.idiom,
              rewrite: syn053.rewrite,
            });
          }
        }
      }

      // ── SYN054: fn-body assignment-expression alias of receiver used as member-access receiver ──
      // Must run BEFORE the switch for the same reason as SYN049.
      if (fnLocalReceiverAssign54 && fnLocalReceiverAssign54.has(tok.text) && !isInsideRange(tok.start, unsafeRanges)) {
        const nextIdx54 = nextSignificant(tokens, i + 1);
        const next54 = tokens[nextIdx54];
        const isDot54 = next54 && next54.kind === "punct" && next54.text === ".";
        const isOptChain54 = next54 && next54.kind === "questionDot";
        if (isDot54 || isOptChain54) {
          const prevIdx54 = prevSignificant(tokens, i - 1);
          const prev54 = tokens[prevIdx54];
          const isMemberTarget54 = prev54 && ((prev54.kind === "punct" && prev54.text === ".") || prev54.kind === "questionDot");
          if (!isMemberTarget54) {
            const memberIdx54 = nextSignificant(tokens, nextIdx54 + 1);
            const memberTok54 = tokens[memberIdx54];
            if (memberTok54 && memberTok54.kind === "ident" && SYN041_DANGEROUS_MEMBERS.has(memberTok54.text)) {
              const origReceiver54 = fnLocalReceiverAssign54.get(tok.text)!;
              const sep54 = isOptChain54 ? "?." : ".";
              const loc54 = locationOf(src, tok.start);
              warnings.push({
                code: "SYN054",
                severity: "warning",
                file: null,
                line: loc54.line,
                column: loc54.column,
                start: tok.start,
                end: memberTok54.end,
                message:
                  `fn '${decl.name}' accesses ${tok.text}${sep54}${memberTok54.text} — '${tok.text}' is a ` +
                  `fn-body assignment alias of the global receiver '${origReceiver54}' (set via assignment expression inside this fn body); ` +
                  `the alias is not in the SYN041 receiver watch-list, so '${tok.text}${sep54}${memberTok54.text}' ` +
                  `bypasses SYN041–SYN053; access '${origReceiver54}${sep54}${memberTok54.text}' directly so SYN041 fires, ` +
                  `or wrap in unsafe "uses ${memberTok54.text} via aliased ${origReceiver54} for <reason>" { ${tok.text}${sep54}${memberTok54.text} }`,
                rule: syn054.rule,
                idiom: syn054.idiom,
                rewrite: syn054.rewrite,
              });
            }
          }
        }
      }

      // ── SYN055: default-parameter alias of guarded global called in fn body ──────
      // Must run BEFORE the switch for the same reason as SYN048.
      if (fnDefaultParamAliases55 && fnDefaultParamAliases55.has(tok.text) && !isInsideRange(tok.start, unsafeRanges)) {
        const nextIdx55 = nextSignificant(tokens, i + 1);
        const next55 = tokens[nextIdx55];
        const isCall55 =
          next55 &&
          ((next55.kind === "open" && next55.text === "(") || next55.kind === "questionDot");
        if (isCall55) {
          const prevIdx55 = prevSignificant(tokens, i - 1);
          const prev55 = tokens[prevIdx55];
          const isMemberAccess55 =
            prev55 &&
            ((prev55.kind === "punct" && prev55.text === ".") || prev55.kind === "questionDot");
          const isDecl55 =
            prev55 &&
            ((prev55.kind === "keyword" && prev55.text === "fn") ||
              (prev55.kind === "ident" &&
                (prev55.text === "function" ||
                  prev55.text === "const" ||
                  prev55.text === "let" ||
                  prev55.text === "var")));
          if (!isMemberAccess55 && !isDecl55) {
            const origGlobal55 = fnDefaultParamAliases55.get(tok.text)!;
            const loc55 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN055",
              severity: "warning",
              file: null,
              line: loc55.line,
              column: loc55.column,
              start: tok.start,
              end: tok.end,
              message:
                `fn '${decl.name}' calls '${tok.text}()' — '${tok.text}' is a default-parameter alias of ` +
                `the guarded global '${origGlobal55}' (bound in the parameter list as \`${tok.text} = ${origGlobal55}\`); ` +
                `calling through the alias bypasses SYN004–SYN054 name-token checks; ` +
                `call '${origGlobal55}' directly so the relevant SYN check fires, ` +
                `or wrap in unsafe "calls ${origGlobal55} via default-param alias for <reason>" { ${tok.text}(...) }`,
              rule: syn055.rule,
              idiom: syn055.idiom,
              rewrite: syn055.rewrite,
            });
          }
        }
      }

      // ── SYN056: default-parameter alias of receiver object used as member-access receiver ──
      // Must run BEFORE the switch for the same reason as SYN049.
      if (fnDefaultParamReceiverAliases56 && fnDefaultParamReceiverAliases56.has(tok.text) && !isInsideRange(tok.start, unsafeRanges)) {
        const nextIdx56 = nextSignificant(tokens, i + 1);
        const next56 = tokens[nextIdx56];
        const isDot56 = next56 && next56.kind === "punct" && next56.text === ".";
        const isOptChain56 = next56 && next56.kind === "questionDot";
        if (isDot56 || isOptChain56) {
          const prevIdx56 = prevSignificant(tokens, i - 1);
          const prev56 = tokens[prevIdx56];
          const isMemberTarget56 = prev56 && ((prev56.kind === "punct" && prev56.text === ".") || prev56.kind === "questionDot");
          if (!isMemberTarget56) {
            const memberIdx56 = nextSignificant(tokens, nextIdx56 + 1);
            const memberTok56 = tokens[memberIdx56];
            if (memberTok56 && memberTok56.kind === "ident" && SYN041_DANGEROUS_MEMBERS.has(memberTok56.text)) {
              const origReceiver56 = fnDefaultParamReceiverAliases56.get(tok.text)!;
              const sep56 = isOptChain56 ? "?." : ".";
              const loc56 = locationOf(src, tok.start);
              warnings.push({
                code: "SYN056",
                severity: "warning",
                file: null,
                line: loc56.line,
                column: loc56.column,
                start: tok.start,
                end: memberTok56.end,
                message:
                  `fn '${decl.name}' accesses ${tok.text}${sep56}${memberTok56.text} — '${tok.text}' is a ` +
                  `default-parameter alias of the global receiver '${origReceiver56}' (bound in the parameter list as \`${tok.text} = ${origReceiver56}\`); ` +
                  `the alias is not in the SYN041 receiver watch-list, so '${tok.text}${sep56}${memberTok56.text}' ` +
                  `bypasses SYN041–SYN055; access '${origReceiver56}${sep56}${memberTok56.text}' directly so SYN041 fires, ` +
                  `or wrap in unsafe "uses ${memberTok56.text} via aliased ${origReceiver56} for <reason>" { ${tok.text}${sep56}${memberTok56.text} }`,
                rule: syn056.rule,
                idiom: syn056.idiom,
                rewrite: syn056.rewrite,
              });
            }
          }
        }
      }

      // ── SYN045: module-scope global-receiver alias used as member-access receiver ──
      // Must run BEFORE the switch for the same reason as SYN044.
      if (receiverAliases.has(tok.text) && !isInsideRange(tok.start, unsafeRanges)) {
        const nextIdx45 = nextSignificant(tokens, i + 1);
        const next45 = tokens[nextIdx45];
        const isDot45 = next45 && next45.kind === "punct" && next45.text === ".";
        const isOptChain45 = next45 && next45.kind === "questionDot";
        if (isDot45 || isOptChain45) {
          // Check that this alias is not itself a property access (e.g. obj.g.fetch)
          const prevIdx45 = prevSignificant(tokens, i - 1);
          const prev45 = tokens[prevIdx45];
          const isMemberTarget45 = prev45 && ((prev45.kind === "punct" && prev45.text === ".") || prev45.kind === "questionDot");
          if (!isMemberTarget45) {
            const memberIdx45 = nextSignificant(tokens, nextIdx45 + 1);
            const memberTok45 = tokens[memberIdx45];
            if (memberTok45 && memberTok45.kind === "ident" && SYN041_DANGEROUS_MEMBERS.has(memberTok45.text)) {
              const origReceiver45 = receiverAliases.get(tok.text)!;
              const sep45 = isOptChain45 ? "?." : ".";
              const loc45 = locationOf(src, tok.start);
              warnings.push({
                code: "SYN045",
                severity: "warning",
                file: null,
                line: loc45.line,
                column: loc45.column,
                start: tok.start,
                end: memberTok45.end,
                message:
                  `fn '${decl.name}' accesses ${tok.text}${sep45}${memberTok45.text} — '${tok.text}' is a ` +
                  `module-scope alias of the global receiver '${origReceiver45}'; the alias name is not in ` +
                  `the SYN041 receiver watch-list, so '${tok.text}${sep45}${memberTok45.text}' bypasses ` +
                  `SYN041–SYN043; access '${origReceiver45}${sep45}${memberTok45.text}' directly so SYN041 fires, ` +
                  `or wrap in unsafe "uses ${memberTok45.text} via aliased ${origReceiver45} for <reason>" { ${tok.text}${sep45}${memberTok45.text} }`,
                rule: syn045.rule,
                idiom: syn045.idiom,
                rewrite: syn045.rewrite,
              });
            }
          }
        }
      }

      // ── SYN052: module-scope assignment-expression alias of a global receiver used as receiver ──
      // Must run BEFORE the switch for the same reason as SYN045.
      if (receiverAssignAliases52.has(tok.text) && !isInsideRange(tok.start, unsafeRanges)) {
        const nextIdx52 = nextSignificant(tokens, i + 1);
        const next52 = tokens[nextIdx52];
        const isDot52 = next52 && next52.kind === "punct" && next52.text === ".";
        const isOptChain52 = next52 && next52.kind === "questionDot";
        if (isDot52 || isOptChain52) {
          const prevIdx52 = prevSignificant(tokens, i - 1);
          const prev52 = tokens[prevIdx52];
          const isMemberTarget52 = prev52 && ((prev52.kind === "punct" && prev52.text === ".") || prev52.kind === "questionDot");
          if (!isMemberTarget52) {
            const memberIdx52 = nextSignificant(tokens, nextIdx52 + 1);
            const memberTok52 = tokens[memberIdx52];
            if (memberTok52 && memberTok52.kind === "ident" && SYN041_DANGEROUS_MEMBERS.has(memberTok52.text)) {
              const origReceiver52 = receiverAssignAliases52.get(tok.text)!;
              const sep52 = isOptChain52 ? "?." : ".";
              const loc52 = locationOf(src, tok.start);
              warnings.push({
                code: "SYN052",
                severity: "warning",
                file: null,
                line: loc52.line,
                column: loc52.column,
                start: tok.start,
                end: memberTok52.end,
                message:
                  `fn '${decl.name}' accesses ${tok.text}${sep52}${memberTok52.text} — '${tok.text}' is a ` +
                  `module-scope assignment alias of the global receiver '${origReceiver52}' (set via assignment ` +
                  `expression, not a declaration); '${tok.text}${sep52}${memberTok52.text}' bypasses SYN041–SYN051; ` +
                  `access '${origReceiver52}${sep52}${memberTok52.text}' directly so SYN041 fires, ` +
                  `or wrap in unsafe "uses ${memberTok52.text} via aliased ${origReceiver52} for <reason>" { ${tok.text}${sep52}${memberTok52.text} }`,
                rule: syn052.rule,
                idiom: syn052.idiom,
                rewrite: syn052.rewrite,
              });
            }
          }
        }
      }

      switch (tok.text) {

        // ── SYN002: native throw ─────────────────────────────────────────────
        case "throw": {
          // Exclude property accesses: obj.throw
          const prevIdx = prevSignificant(tokens, i - 1);
          const prev = tokens[prevIdx];
          if (prev && ((prev.kind === "punct" && prev.text === ".") || prev.kind === "questionDot"))
            continue;

          // Exclude getter/setter accessor names: { get throw() {} }, { set throw(v) {} }
          if (prev && prev.kind === "ident" && (prev.text === "get" || prev.text === "set")) continue;

          // Exclude object literal property keys: { throw: 1 }
          const nextIdx = nextSignificant(tokens, i + 1);
          const next = tokens[nextIdx];
          if (next && next.kind === "punct" && next.text === ":") continue;

          // Exclude class/object field assignments: class X { throw = 1 }
          if (next && next.kind === "eq") continue;

          // Exclude definite-assignment assertions: class X { throw!: T }
          if (next && next.kind === "operator" && next.text === "!") {
            const afterBangIdx = nextSignificant(tokens, nextIdx + 1);
            const afterBang = tokens[afterBangIdx];
            if (afterBang && (afterBang.kind === "punct" && afterBang.text === ":" || afterBang.kind === "eq")) continue;
          }

          // Exclude optional method signatures: throw?() / throw?(): T
          if (next && next.kind === "question") continue;

          // Exclude generic method names: throw<T>() — skip over `<…>` to find `(`.
          let effectiveNextIdx = nextIdx;
          let effectiveNext = next;
          if (next && next.kind === "operator" && next.text === "<") {
            let depth = 1;
            let j = nextIdx + 1;
            while (j < tokens.length && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth -= t.text.length;
              j++;
            }
            const afterGenericIdx = nextSignificant(tokens, j);
            const afterGeneric = tokens[afterGenericIdx];
            if (afterGeneric && afterGeneric.kind === "open" && afterGeneric.text === "(") {
              effectiveNextIdx = afterGenericIdx;
              effectiveNext = afterGeneric;
            }
          }

          // Exclude object literal method shorthands: { throw() {} }
          // and type-literal method signatures: { throw() }, { throw(): T; }
          if (effectiveNext && effectiveNext.kind === "open" && effectiveNext.text === "(") {
            const closeParenIdx = effectiveNext.matchedAt;
            if (closeParenIdx !== undefined) {
              const firstInsideIdx = nextSignificant(tokens, effectiveNextIdx + 1);
              if (firstInsideIdx === closeParenIdx) continue; // empty parens → method signature
              const afterParenIdx = nextSignificant(tokens, closeParenIdx + 1);
              const afterParen = tokens[afterParenIdx];
              if (
                afterParen &&
                ((afterParen.kind === "open" && afterParen.text === "{") ||
                  afterParen.kind === "fatArrow" ||
                  (afterParen.kind === "punct" && afterParen.text === ":"))
              ) continue;
            }
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const loc = locationOf(src, tok.start);
          warnings.push({
            code: "SYN002",
            severity: "warning",
            file: null,
            line: loc.line,
            column: loc.column,
            start: tok.start,
            end: tok.end,
            message:
              `fn '${decl.name}' contains a native throw statement — ` +
              `callers using ? unwrap or match on Result will not observe this error; ` +
              `use return err(new ErrorType(...)) instead`,
            rule: syn002.rule,
            idiom: syn002.idiom,
            rewrite: syn002.rewrite,
          });
          break;
        }

        // ── SYN003: console.* call ───────────────────────────────────────────
        case "console": {
          // Exclude: `obj.console` — preceded by `.` or `?.`
          const prevIdx = prevSignificant(tokens, i - 1);
          const prev = tokens[prevIdx];
          if (prev && ((prev.kind === "punct" && prev.text === ".") || prev.kind === "questionDot"))
            continue;

          // Must be followed by `.` or `?.` (member access).
          let nextIdx = nextSignificant(tokens, i + 1);
          let next = tokens[nextIdx];
          // Paren-receiver bypass: `(console).log()` — resolve through paren group.
          const parenDotIdx = resolveParenGroupedMemberReceiverIdx(tokens, i);
          if (parenDotIdx !== null) { nextIdx = parenDotIdx; next = tokens[nextIdx]; }
          const isDot = next && next.kind === "punct" && next.text === ".";
          const isOptChain = next && next.kind === "questionDot";
          if (!isDot && !isOptChain) continue;

          // Next must be a known console output method.
          const methodIdx = nextSignificant(tokens, nextIdx + 1);
          const method = tokens[methodIdx];
          if (!method || method.kind !== "ident" || !CONSOLE_OUTPUT_METHODS.has(method.text)) continue;

          // Must be a call: next after the method must be `(` or `?.(`.
          let afterMethodIdx = nextSignificant(tokens, methodIdx + 1);
          let afterMethod = tokens[afterMethodIdx];
          let isOptCall = false;
          if (afterMethod && afterMethod.kind === "questionDot") {
            isOptCall = true;
            afterMethodIdx = nextSignificant(tokens, afterMethodIdx + 1);
            afterMethod = tokens[afterMethodIdx];
          }
          if (!afterMethod || !(afterMethod.kind === "open" && afterMethod.text === "(")) continue;

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const sep = isOptChain ? "?." : ".";
          const callSep = isOptCall ? "?." : "";
          const loc = locationOf(src, tok.start);
          warnings.push({
            code: "SYN003",
            severity: "warning",
            file: null,
            line: loc.line,
            column: loc.column,
            start: tok.start,
            end: method.end,
            message:
              `fn '${decl.name}' calls console${sep}${method.text}${callSep}() — ` +
              `direct console output bypasses the stdout/stderr capability model; ` +
              `use stdout.write(...) or stderr.write(...) and declare uses { stdout } or uses { stderr }`,
            rule: syn003.rule,
            idiom: syn003.idiom,
            rewrite: syn003.rewrite,
          });
          break;
        }

        // ── SYN004: eval(...) ────────────────────────────────────────────────
        case "eval": {
          // Exclude: `obj.eval(...)` — preceded by `.` or `?.`
          const prevIdx4 = prevSignificant(tokens, i - 1);
          const prev4 = tokens[prevIdx4];
          if (prev4 && ((prev4.kind === "punct" && prev4.text === ".") || prev4.kind === "questionDot"))
            continue;

          // Must be followed by `(`, `?.(`, or `<T>(`.
          const nextIdx4 = nextSignificant(tokens, i + 1);
          const next4 = tokens[nextIdx4];
          let isOptEval = false;
          let callIdx4 = nextIdx4;
          if (next4 && next4.kind === "questionDot") {
            isOptEval = true;
            callIdx4 = nextSignificant(tokens, nextIdx4 + 1);
          } else if (next4 && next4.kind === "operator" && next4.text === "<") {
            let depth = 1;
            let j = nextIdx4 + 1;
            while (j < tokens.length && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth -= t.text.length;
              j++;
            }
            const afterGenericIdx4 = nextSignificant(tokens, j);
            const afterGeneric4 = tokens[afterGenericIdx4];
            if (afterGeneric4 && afterGeneric4.kind === "open" && afterGeneric4.text === "(")
              callIdx4 = afterGenericIdx4;
          }
          let callTok4 = tokens[callIdx4];
          if (!callTok4 || !(callTok4.kind === "open" && callTok4.text === "(")) {
            const parenIdx4 = resolveParenGroupedCallIdx(tokens, i);
            if (parenIdx4 === null) continue;
            callIdx4 = parenIdx4;
            callTok4 = tokens[callIdx4]!;
          }

          // Exclude declarations: `function eval(params) {}`, method shorthands, etc.
          if (callTok4.matchedAt !== undefined) {
            const afterCloseIdx = nextSignificant(tokens, callTok4.matchedAt + 1);
            const afterClose = tokens[afterCloseIdx];
            const isTernaryConsequent = prev4 && prev4.kind === "question";
            if (afterClose && (
              (afterClose.kind === "open" && afterClose.text === "{") ||
              afterClose.kind === "fatArrow" ||
              (!isTernaryConsequent && afterClose.kind === "punct" && afterClose.text === ":")
            )) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const callSep4 = isOptEval ? "?." : "";
          const loc4 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN004",
            severity: "warning",
            file: null,
            line: loc4.line,
            column: loc4.column,
            start: tok.start,
            end: callTok4.start + 1,
            message:
              `fn '${decl.name}' calls eval${callSep4}() — ` +
              `eval executes a string as code and bypasses all static capability, ` +
              `resource, and safety checks; refactor to explicit code or wrap in unsafe "reason" { eval(src) }`,
            rule: syn004.rule,
            idiom: syn004.idiom,
            rewrite: syn004.rewrite,
          });
          break;
        }

        // ── SYN004: new Function(...) / Function(...) ────────────────────────
        case "Function": {
          const prevIdx4 = prevSignificant(tokens, i - 1);
          const prev4 = tokens[prevIdx4];

          // Exclude: `obj.Function(...)` — preceded by `.` or `?.`
          if (prev4 && ((prev4.kind === "punct" && prev4.text === ".") || prev4.kind === "questionDot"))
            continue;

          // Must be followed by `(`, `?.(`, or `<T>(`.
          const nextIdx4 = nextSignificant(tokens, i + 1);
          const next4 = tokens[nextIdx4];
          let isOptFunc = false;
          let callIdx4 = nextIdx4;
          if (next4 && next4.kind === "questionDot") {
            isOptFunc = true;
            callIdx4 = nextSignificant(tokens, nextIdx4 + 1);
          } else if (next4 && next4.kind === "operator" && next4.text === "<") {
            let depth = 1;
            let j = nextIdx4 + 1;
            while (j < tokens.length && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth -= t.text.length;
              j++;
            }
            const afterGenericIdx4 = nextSignificant(tokens, j);
            const afterGeneric4 = tokens[afterGenericIdx4];
            if (afterGeneric4 && afterGeneric4.kind === "open" && afterGeneric4.text === "(")
              callIdx4 = afterGenericIdx4;
          }
          let callTok4 = tokens[callIdx4];
          if (!callTok4 || !(callTok4.kind === "open" && callTok4.text === "(")) {
            const parenIdx4 = resolveParenGroupedCallIdx(tokens, i);
            if (parenIdx4 === null) continue;
            callIdx4 = parenIdx4;
            callTok4 = tokens[callIdx4]!;
          }

          // Exclude declarations and method shorthands. Guard `:` against ternary.
          if (callTok4.matchedAt !== undefined) {
            const afterCloseIdx = nextSignificant(tokens, callTok4.matchedAt + 1);
            const afterClose = tokens[afterCloseIdx];
            const prevBeforeNew4 = (prev4 && prev4.kind === "ident" && prev4.text === "new")
              ? tokens[prevSignificant(tokens, prevIdx4 - 1)]
              : undefined;
            const isTernaryConsequent4 = (prev4 && prev4.kind === "question") ||
              (prevBeforeNew4 !== undefined && prevBeforeNew4 !== null && prevBeforeNew4.kind === "question");
            if (afterClose && (
              (afterClose.kind === "open" && afterClose.text === "{") ||
              afterClose.kind === "fatArrow" ||
              (!isTernaryConsequent4 && afterClose.kind === "punct" && afterClose.text === ":")
            )) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const hasNew = prev4 && prev4.kind === "ident" && prev4.text === "new";
          const funcCallSep = isOptFunc ? "?." : "";
          const warnStart = hasNew ? prev4!.start : tok.start;
          const loc4 = locationOf(src, warnStart);
          warnings.push({
            code: "SYN004",
            severity: "warning",
            file: null,
            line: loc4.line,
            column: loc4.column,
            start: warnStart,
            end: callTok4.start + 1,
            message:
              `fn '${decl.name}' constructs ${hasNew ? "new " : ""}Function${funcCallSep}() — ` +
              `the Function constructor executes a string as code and bypasses all static checks; ` +
              `refactor to explicit code or wrap in unsafe "reason" { ${hasNew ? "new Function(body)" : "Function(body)"} }`,
            rule: syn004.rule,
            idiom: syn004.idiom,
            rewrite: syn004.rewrite,
          });
          break;
        }

        // ── SYN005 + SYN006: process.env / process.exit ──────────────────────
        case "process": {
          // Exclude: `obj.process` — preceded by `.` or `?.`
          const prevIdx5 = prevSignificant(tokens, i - 1);
          const prev5 = tokens[prevIdx5];
          if (prev5 && ((prev5.kind === "punct" && prev5.text === ".") || prev5.kind === "questionDot"))
            continue;

          // Must be followed by `.` or `?.`
          let nextIdx5 = nextSignificant(tokens, i + 1);
          let next5 = tokens[nextIdx5];
          // Paren-receiver bypass: `(process).env` — resolve through paren group.
          const parenDotIdx5 = resolveParenGroupedMemberReceiverIdx(tokens, i);
          if (parenDotIdx5 !== null) { nextIdx5 = parenDotIdx5; next5 = tokens[nextIdx5]; }
          const isDot5 = next5 && next5.kind === "punct" && next5.text === ".";
          const isOptChain5 = next5 && next5.kind === "questionDot";
          if (!isDot5 && !isOptChain5) continue;

          // Check the member name: `env` → SYN005, `exit` → SYN006.
          const memberIdx = nextSignificant(tokens, nextIdx5 + 1);
          const memberTok = tokens[memberIdx];
          if (!memberTok || memberTok.kind !== "ident") continue;

          const sep5 = isOptChain5 ? "?." : ".";

          if (memberTok.text === "env") {
            // SYN005: process.env access.
            // Suppression is checked on the `env` token, not just `process`.
            if (isInsideRange(memberTok.start, unsafeRanges)) continue;

            const loc5 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN005",
              severity: "warning",
              file: null,
              line: loc5.line,
              column: loc5.column,
              start: tok.start,
              end: memberTok.end,
              message:
                `fn '${decl.name}' accesses process${sep5}env — ` +
                `env-var access is invisible to callers; pass config and secrets as explicit parameters, ` +
                `or wrap in unsafe "reads deployment env" { process.env.KEY }`,
              rule: syn005.rule,
              idiom: syn005.idiom,
              rewrite: syn005.rewrite,
            });

          } else if (memberTok.text === "exit") {
            // SYN006: process.exit() call.
            // Must be followed by `(` or `?.(` — confirming this is a call, not `process.exit.bind`.
            let afterExitIdx = nextSignificant(tokens, memberIdx + 1);
            let afterExit = tokens[afterExitIdx];
            let isOptCall6 = false;
            if (afterExit && afterExit.kind === "questionDot") {
              isOptCall6 = true;
              afterExitIdx = nextSignificant(tokens, afterExitIdx + 1);
              afterExit = tokens[afterExitIdx];
            }
            if (!afterExit || !(afterExit.kind === "open" && afterExit.text === "(")) continue;

            // Suppression is checked on the `exit` call token, not just `process`.
            if (isInsideRange(memberTok.start, unsafeRanges)) continue;

            const callSep6 = isOptCall6 ? "?." : "";
            const loc6 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN006",
              severity: "warning",
              file: null,
              line: loc6.line,
              column: loc6.column,
              start: tok.start,
              end: memberTok.end,
              message:
                `fn '${decl.name}' calls process${sep5}exit${callSep6}() — ` +
                `process.exit terminates the entire host process; callers cannot catch it, ` +
                `no Result propagation runs; return err(...) instead or wrap in ` +
                `unsafe "exits on invalid config" { process.exit(1) }`,
              rule: syn006.rule,
              idiom: syn006.idiom,
              rewrite: syn006.rewrite,
            });
          } else if (SYN022_PROCESS_MEMBERS.has(memberTok.text)) {
            // SYN022: ambient process state access (argv, cwd, platform, arch, pid, etc.)
            if (isInsideRange(memberTok.start, unsafeRanges)) continue;

            const loc22 = locationOf(src, tok.start);
            // Distinguish calls (cwd(), hrtime(), etc.) from property reads (argv, pid, etc.)
            // Also distinguish optional-call form (process.cwd?.()) to preserve semantics in message.
            const afterMemberIdx22 = nextSignificant(tokens, memberIdx + 1);
            const afterMember22 = tokens[afterMemberIdx22];
            let isCall22 = false;
            let isOptCall22 = false;
            if (afterMember22 && afterMember22.kind === "open" && afterMember22.text === "(") {
              isCall22 = true;
            } else if (afterMember22 && afterMember22.kind === "questionDot") {
              const afterQD22 = tokens[nextSignificant(tokens, afterMemberIdx22 + 1)];
              if (afterQD22 && afterQD22.kind === "open" && afterQD22.text === "(") {
                isCall22 = true;
                isOptCall22 = true;
              }
            }
            const callSuffix22 = isCall22 ? (isOptCall22 ? "?.()" : "()") : "";
            const form22 = `process${sep5}${memberTok.text}${callSuffix22}`;
            warnings.push({
              code: "SYN022",
              severity: "warning",
              file: null,
              line: loc22.line,
              column: loc22.column,
              start: tok.start,
              end: memberTok.end,
              message:
                `fn '${decl.name}' accesses ${form22} — ` +
                `ambient Node.js process state invisible to the capability model; ` +
                `pass the value as an explicit parameter (preferred) or wrap in ` +
                `unsafe "accesses process.${memberTok.text} for <reason>" { ${form22} }`,
              rule: syn022.rule,
              idiom: syn022.idiom,
              rewrite: syn022.rewrite,
            });
          }
          break;
        }

        // ── SYN007: fetch() call ─────────────────────────────────────────────
        case "fetch": {
          const prevIdx7 = prevSignificant(tokens, i - 1);
          const prev7 = tokens[prevIdx7];

          // Exclude: `obj.fetch(...)` — preceded by `.` or `?.`
          if (prev7 && ((prev7.kind === "punct" && prev7.text === ".") || prev7.kind === "questionDot"))
            continue;

          // Exclude: function/fn/function* declarations named fetch
          if (prev7 && prev7.kind === "ident" && prev7.text === "function") continue;
          if (prev7 && prev7.kind === "keyword" && prev7.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx7)) continue;

          // Must be followed by `(` or `?.(` — confirming this is a call.
          const nextIdx7 = nextSignificant(tokens, i + 1);
          const next7 = tokens[nextIdx7];

          let callIdx7 = nextIdx7;
          let isOpt7 = false;
          if (next7 && next7.kind === "questionDot") {
            isOpt7 = true;
            callIdx7 = nextSignificant(tokens, nextIdx7 + 1);
          }
          let callTok7 = tokens[callIdx7];
          if (!callTok7 || !(callTok7.kind === "open" && callTok7.text === "(")) {
            const parenIdx7 = resolveParenGroupedCallIdx(tokens, i);
            if (parenIdx7 === null) continue;
            callIdx7 = parenIdx7;
            callTok7 = tokens[callIdx7]!;
          }

          // Exclude method shorthands and TS method signatures: { fetch(url) { } } / { fetch(url): T; }
          // Guard the `:` check against ternary consequents: `cond ? fetch(url) : other`
          // Also handles `cond ? await fetch(url) : other` — if prev is `await`, look one further back.
          const prevBeforeAwait7 = (prev7 && prev7.kind === "ident" && prev7.text === "await")
            ? tokens[prevSignificant(tokens, prevIdx7 - 1)]
            : undefined;
          const isTernaryConsequent7 = (prev7 !== undefined && prev7 !== null && prev7.kind === "question") ||
            (prevBeforeAwait7 !== undefined && prevBeforeAwait7 !== null && prevBeforeAwait7.kind === "question");
          if (callTok7.matchedAt !== undefined) {
            const afterCloseIdx7 = nextSignificant(tokens, callTok7.matchedAt + 1);
            const afterClose7 = tokens[afterCloseIdx7];
            if (afterClose7 && (
              (afterClose7.kind === "open" && afterClose7.text === "{") ||
              afterClose7.kind === "fatArrow" ||
              (!isTernaryConsequent7 && afterClose7.kind === "punct" && afterClose7.text === ":")
            )) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const callSep7 = isOpt7 ? "?." : "";
          const loc7 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN007",
            severity: "warning",
            file: null,
            line: loc7.line,
            column: loc7.column,
            start: tok.start,
            end: callTok7.start + 1,
            message:
              `fn '${decl.name}' calls fetch${callSep7}() — ` +
              `fetch makes an HTTP request invisible to the capability model; ` +
              `replace with http.get(url)/http.post(url, { body }) and add uses { net }, ` +
              `or wrap in unsafe "calls fetch directly" { fetch(url) }`,
            rule: syn007.rule,
            idiom: syn007.idiom,
            rewrite: syn007.rewrite,
          });
          break;
        }

        // ── SYN008: new WebSocket() / WebSocket() call ───────────────────────
        case "WebSocket": {
          const prevIdx8 = prevSignificant(tokens, i - 1);
          const prev8 = tokens[prevIdx8];

          // Exclude: `obj.WebSocket(...)` — preceded by `.` or `?.`
          if (prev8 && ((prev8.kind === "punct" && prev8.text === ".") || prev8.kind === "questionDot"))
            continue;

          // Exclude: function/fn/function* declarations named WebSocket
          if (prev8 && prev8.kind === "ident" && prev8.text === "function") continue;
          if (prev8 && prev8.kind === "keyword" && prev8.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx8)) continue;

          const hasNew8 = prev8 && prev8.kind === "ident" && prev8.text === "new";
          // For ternary guard: check if token before WebSocket (or before `new`) is `?`
          const prevBeforeNew8 = hasNew8
            ? tokens[prevSignificant(tokens, prevIdx8 - 1)]
            : undefined;
          const isTernaryConsequent8 = (prev8 !== undefined && prev8 !== null && prev8.kind === "question") ||
            (prevBeforeNew8 !== undefined && prevBeforeNew8 !== null && prevBeforeNew8.kind === "question");

          const nextIdx8 = nextSignificant(tokens, i + 1);
          const next8 = tokens[nextIdx8];

          let isOpt8 = false;
          let callIdx8 = nextIdx8;

          if (next8 && next8.kind === "questionDot") {
            // WebSocket?.( — optional call (no generic scan to avoid false-positives)
            isOpt8 = true;
            callIdx8 = nextSignificant(tokens, nextIdx8 + 1);
          } else if (hasNew8 && next8 && next8.kind === "operator" && next8.text === "<") {
            // new WebSocket<T>( — generic scan only when `new` precedes, preventing
            // `WebSocket < x > (y)` comparison expressions from false-firing.
            let depth = 1;
            let j = nextIdx8 + 1;
            while (j < tokens.length && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth = Math.max(0, depth - t.text.length);
              j++;
            }
            callIdx8 = nextSignificant(tokens, j);
          }

          let callTok8 = tokens[callIdx8];
          if (!callTok8 || !(callTok8.kind === "open" && callTok8.text === "(")) {
            const parenIdx8 = resolveParenGroupedCallIdx(tokens, i);
            if (parenIdx8 === null) continue;
            callIdx8 = parenIdx8;
            callTok8 = tokens[callIdx8]!;
          }

          // Exclude method shorthands and TS method signatures: { WebSocket(url) { ... } } / { WebSocket(url): T; }
          // Guard the `:` check against ternary consequents: `cond ? WebSocket(url) : other`
          if (callTok8.matchedAt !== undefined) {
            const afterCloseIdx8 = nextSignificant(tokens, callTok8.matchedAt + 1);
            const afterClose8 = tokens[afterCloseIdx8];
            if (afterClose8 && (
              (afterClose8.kind === "open" && afterClose8.text === "{") ||
              afterClose8.kind === "fatArrow" ||
              (!isTernaryConsequent8 && afterClose8.kind === "punct" && afterClose8.text === ":")
            )) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const callSep8 = isOpt8 ? "?." : "";
          const warnStart8 = hasNew8 ? prev8!.start : tok.start;
          const loc8 = locationOf(src, warnStart8);
          warnings.push({
            code: "SYN008",
            severity: "warning",
            file: null,
            line: loc8.line,
            column: loc8.column,
            start: warnStart8,
            end: callTok8.start + 1,
            message:
              `fn '${decl.name}' ${hasNew8 ? "constructs new " : "calls "}WebSocket${callSep8}() — ` +
              `WebSocket opens a network connection invisible to the capability model; ` +
              `wrap in unsafe "wraps WebSocket for <reason>" { ${hasNew8 ? "new " : ""}WebSocket${isOpt8 ? "?." : ""}(url) }`,
            rule: syn008.rule,
            idiom: syn008.idiom,
            rewrite: syn008.rewrite,
          });
          break;
        }

        // ── SYN009: new XMLHttpRequest() / XMLHttpRequest() call ─────────────
        case "XMLHttpRequest": {
          const prevIdx9 = prevSignificant(tokens, i - 1);
          const prev9 = tokens[prevIdx9];

          // Exclude: `obj.XMLHttpRequest(...)` — preceded by `.` or `?.`
          if (prev9 && ((prev9.kind === "punct" && prev9.text === ".") || prev9.kind === "questionDot"))
            continue;

          // Exclude: function/fn/function* declarations named XMLHttpRequest
          if (prev9 && prev9.kind === "ident" && prev9.text === "function") continue;
          if (prev9 && prev9.kind === "keyword" && prev9.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx9)) continue;

          const isNewExpr9 = prev9 && prev9.kind === "ident" && prev9.text === "new";

          // Ternary guard
          const prevBeforeNew9 = isNewExpr9
            ? tokens[prevSignificant(tokens, prevIdx9 - 1)]
            : undefined;
          const isTernaryConsequent9 =
            (prev9 !== undefined && prev9 !== null && prev9.kind === "question") ||
            (prevBeforeNew9 !== undefined && prevBeforeNew9 !== null && prevBeforeNew9.kind === "question");

          const afterXhrFirstIdx = nextSignificant(tokens, i + 1);
          const afterXhr = tokens[afterXhrFirstIdx];

          if (afterXhr && afterXhr.kind === "operator" && afterXhr.text === "<") {
            // TypeScript generic form: XMLHttpRequest<T>(...) or new XMLHttpRequest<T>
            let anglDepth = 1;
            let j = afterXhrFirstIdx + 1;
            while (j < decl.tokenEnd && anglDepth > 0) {
              const at = tokens[j];
              if (!at) { j++; continue; }
              if (at.kind === "operator" && at.text === "<") anglDepth++;
              else if (at.kind === "operator" && (at.text === ">" || at.text === ">>" || at.text === ">>>"))
                anglDepth = Math.max(0, anglDepth - at.text.length);
              j++;
            }
            const afterAngleIdx = nextSignificant(tokens, j);
            const afterAngle9 = tokens[afterAngleIdx];
            if (afterAngle9 && afterAngle9.kind === "open" && afterAngle9.text === "(") {
              if (afterAngle9.matchedAt !== undefined) {
                const afterCloseIdx9 = nextSignificant(tokens, afterAngle9.matchedAt + 1);
                const afterClose9 = tokens[afterCloseIdx9];
                if (afterClose9 && (
                  (afterClose9.kind === "open" && afterClose9.text === "{") ||
                  afterClose9.kind === "fatArrow" ||
                  (!isTernaryConsequent9 && afterClose9.kind === "punct" && afterClose9.text === ":")
                )) continue;
              }
            } else if (!isNewExpr9) {
              continue; // bare XMLHttpRequest<T> without new and without parens
            }
          } else if (afterXhr && afterXhr.kind === "questionDot") {
            // XMLHttpRequest?.(...)
            const afterQD9 = nextSignificant(tokens, afterXhrFirstIdx + 1);
            const afterQDTok9 = tokens[afterQD9];
            if (!afterQDTok9 || !(afterQDTok9.kind === "open" && afterQDTok9.text === "(")) continue;
          } else if (afterXhr && afterXhr.kind === "open" && afterXhr.text === "(") {
            // Direct call — exclude method shorthands and TS method signatures
            if (afterXhr.matchedAt !== undefined) {
              const afterCloseIdx9 = nextSignificant(tokens, afterXhr.matchedAt + 1);
              const afterClose9 = tokens[afterCloseIdx9];
              if (afterClose9 && (
                (afterClose9.kind === "open" && afterClose9.text === "{") ||
                afterClose9.kind === "fatArrow" ||
                (!isTernaryConsequent9 && afterClose9.kind === "punct" && afterClose9.text === ":")
              )) continue;
            }
          } else {
            // No parens — fire only if preceded by `new` (bare construction: `new XMLHttpRequest`)
            // or followed by `?.` (optional call form handled above),
            // or it's a paren-grouped call: (XMLHttpRequest)(url) / new (XMLHttpRequest)(url).
            if (afterXhr && afterXhr.kind === "punct" && afterXhr.text === ".") continue;
            if (!isNewExpr9 && resolveParenGroupedCallIdx(tokens, i) === null) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const loc9 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN009",
            severity: "warning",
            file: null,
            line: loc9.line,
            column: loc9.column,
            start: tok.start,
            end: tok.end,
            message:
              `fn '${decl.name}' constructs an XMLHttpRequest — bypasses the net capability model; ` +
              `switch to http.get(url)/http.post(url, { body }) and declare uses { net } on the fn header, ` +
              `or wrap in unsafe "wraps XHR directly" { new XMLHttpRequest() }`,
            rule: syn009.rule,
            idiom: syn009.idiom,
            rewrite: syn009.rewrite,
          });
          break;
        }

        // ── SYN011: dynamic import() call ────────────────────────────────────
        case "import": {
          // Exclude: `obj.import(...)` — preceded by `.` or `?.`
          const prevIdx11 = prevSignificant(tokens, i - 1);
          const prev11 = tokens[prevIdx11];
          if (prev11 && ((prev11.kind === "punct" && prev11.text === ".") || prev11.kind === "questionDot"))
            continue;

          // Exclude: `fn import(...)` botscript declarations — `fn` is kind="keyword".
          if (prev11 && prev11.kind === "keyword" && prev11.text === "fn") continue;

          const nextIdx11 = nextSignificant(tokens, i + 1);
          const next11 = tokens[nextIdx11];

          // ── SYN033: import.meta.env.* — three-level chain ───────────────────
          // Detect `import.meta.env` (or `?.` variant at the meta→env dot).
          // All other `import.*` property accesses fall through to the `continue`
          // below, which excludes them from SYN011.
          if (next11 && next11.kind === "punct" && next11.text === ".") {
            const metaIdx33 = nextSignificant(tokens, nextIdx11 + 1);
            const metaTok33 = tokens[metaIdx33];
            if (metaTok33 && metaTok33.kind === "ident" && metaTok33.text === "meta") {
              const dotAfterMetaIdx = nextSignificant(tokens, metaIdx33 + 1);
              const dotAfterMeta = tokens[dotAfterMetaIdx];
              const isMetaDot = dotAfterMeta && dotAfterMeta.kind === "punct" && dotAfterMeta.text === ".";
              const isMetaOptDot = dotAfterMeta && dotAfterMeta.kind === "questionDot";
              if (isMetaDot || isMetaOptDot) {
                const envIdx33 = nextSignificant(tokens, dotAfterMetaIdx + 1);
                const envTok33 = tokens[envIdx33];
                if (envTok33 && envTok33.kind === "ident" && envTok33.text === "env") {
                  if (!isInsideRange(tok.start, unsafeRanges)) {
                    const sep33 = isMetaOptDot ? "?." : ".";
                    const loc33 = locationOf(src, tok.start);
                    warnings.push({
                      code: "SYN033",
                      severity: "warning",
                      file: null,
                      line: loc33.line,
                      column: loc33.column,
                      start: tok.start,
                      end: envTok33.end,
                      message:
                        `fn '${decl.name}' accesses import.meta${sep33}env — ` +
                        `import.meta.env reads build-time environment variables invisible to callers; ` +
                        `pass config values as explicit fn parameters, or wrap in ` +
                        `unsafe "reads build-time env" { import.meta.env.KEY }`,
                      rule: syn033.rule,
                      idiom: syn033.idiom,
                      rewrite: syn033.rewrite,
                    });
                  }
                }
              }
            }
            // All `import.X` forms (not import.meta.env): exclude from SYN011.
            continue;
          }

          // Must be followed by `(` or `?.(` — confirming this is a dynamic import call.
          let isOptImport = false;
          let callIdx11 = nextIdx11;
          if (next11 && next11.kind === "questionDot") {
            isOptImport = true;
            callIdx11 = nextSignificant(tokens, nextIdx11 + 1);
          }
          const callTok11 = tokens[callIdx11];
          if (!callTok11 || !(callTok11.kind === "open" && callTok11.text === "(")) continue;

          // Exclude object/class method shorthands: { import(x) { ... } }
          // and TypeScript method signatures: { import(x): T; }
          // Exception: when prev11 is `?` (ternary), a trailing `:` is the
          // ternary else-branch, not a method return type — don't suppress.
          const isTernaryConsequent = prev11 && prev11.kind === "question";
          if (callTok11.matchedAt !== undefined) {
            const afterCloseIdx = nextSignificant(tokens, callTok11.matchedAt + 1);
            const afterClose = tokens[afterCloseIdx];
            if (afterClose && (
              (afterClose.kind === "open" && afterClose.text === "{") ||
              afterClose.kind === "fatArrow" ||
              (!isTernaryConsequent && afterClose.kind === "punct" && afterClose.text === ":")
            )) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const callSep11 = isOptImport ? "?." : "";
          const loc11 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN011",
            severity: "warning",
            file: null,
            line: loc11.line,
            column: loc11.column,
            start: tok.start,
            end: callTok11.start + 1,
            message:
              `fn '${decl.name}' calls import${callSep11}() — ` +
              `dynamic imports load a module at runtime whose capability surface is unbounded; ` +
              `wrap in unsafe "loads <module> for <reason>" { import(specifier) }`,
            rule: syn011.rule,
            idiom: syn011.idiom,
            rewrite: syn011.rewrite,
          });
          break;
        }

        // ── SYN012: new EventSource() / EventSource() call ──────────────────
        case "EventSource": {
          // Exclude: `obj.EventSource(...)` — preceded by `.` or `?.`
          const prevIdx12 = prevSignificant(tokens, i - 1);
          const prev12 = tokens[prevIdx12];
          if (prev12 && ((prev12.kind === "punct" && prev12.text === ".") || prev12.kind === "questionDot"))
            continue;

          // Exclude: function/fn/function* declarations named EventSource
          if (prev12 && prev12.kind === "ident" && prev12.text === "function") continue;
          if (prev12 && prev12.kind === "keyword" && prev12.text === "fn") continue;
          // Generator: `function* EventSource` — prev token is `*` (operator kind), token before that is `function`
          if (prev12 && prev12.kind === "operator" && prev12.text === "*") {
            const prevPrevIdx12 = prevSignificant(tokens, prevIdx12 - 1);
            const prevPrev12 = tokens[prevPrevIdx12];
            if (prevPrev12 && prevPrev12.kind === "ident" && prevPrev12.text === "function") continue;
          }

          const hasNew12 = prev12 && prev12.kind === "ident" && prev12.text === "new";
          // Ternary guard: `cond ? EventSource(url) : other` / `cond ? new EventSource(url) : other`
          const prevBeforeNew12 = hasNew12
            ? tokens[prevSignificant(tokens, prevIdx12 - 1)]
            : undefined;
          const isTernaryConsequent12 =
            (prev12 !== undefined && prev12 !== null && prev12.kind === "question") ||
            (prevBeforeNew12 !== undefined && prevBeforeNew12 !== null && prevBeforeNew12.kind === "question");

          const nextIdx12 = nextSignificant(tokens, i + 1);
          const next12 = tokens[nextIdx12];

          let isOpt12 = false;
          let callIdx12 = nextIdx12;

          if (next12 && next12.kind === "questionDot") {
            // EventSource?.( — optional call (no generic scan to avoid false-positives)
            isOpt12 = true;
            callIdx12 = nextSignificant(tokens, nextIdx12 + 1);
          } else if (hasNew12 && next12 && next12.kind === "operator" && next12.text === "<") {
            // new EventSource<T>( — generic scan only when `new` precedes
            let depth = 1;
            let j = nextIdx12 + 1;
            while (j < tokens.length && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth = Math.max(0, depth - t.text.length);
              j++;
            }
            callIdx12 = nextSignificant(tokens, j);
          }

          let callTok12 = tokens[callIdx12];
          if (!callTok12 || !(callTok12.kind === "open" && callTok12.text === "(")) {
            const parenIdx12 = resolveParenGroupedCallIdx(tokens, i);
            if (parenIdx12 === null) continue;
            callIdx12 = parenIdx12;
            callTok12 = tokens[callIdx12]!;
          }

          // Exclude method shorthands and TS method signatures: { EventSource(url) { } } / { EventSource(url): T; }
          if (callTok12.matchedAt !== undefined) {
            const afterCloseIdx12 = nextSignificant(tokens, callTok12.matchedAt + 1);
            const afterClose12 = tokens[afterCloseIdx12];
            if (afterClose12 && (
              (afterClose12.kind === "open" && afterClose12.text === "{") ||
              afterClose12.kind === "fatArrow" ||
              (!isTernaryConsequent12 && afterClose12.kind === "punct" && afterClose12.text === ":")
            )) continue;
            // Exclude TS method signatures with omitted return type:
            // `{ EventSource(url: string) }` — a `:` at depth 0 inside the parens.
            // Also handles optional params: `{ EventSource(url?: string) }`.
            let hasTypeAnnotation12 = false;
            let depth12 = 0;
            let ternaryDepth12 = 0;
            for (let k12 = callIdx12 + 1; k12 < callTok12.matchedAt; k12++) {
              const at12 = tokens[k12];
              if (!at12) continue;
              if (at12.kind === "open") { depth12++; continue; }
              if (at12.kind === "close") { depth12--; continue; }
              if (depth12 !== 0) continue;
              if (at12.kind === "question") {
                // `?:` is an optional-parameter marker, not a ternary — peek ahead
                const nextAfterQ12 = nextSignificant(tokens, k12 + 1);
                const nextTokQ12 = tokens[nextAfterQ12];
                if (nextTokQ12 && nextTokQ12.kind === "punct" && nextTokQ12.text === ":") {
                  hasTypeAnnotation12 = true;
                  break;
                }
                ternaryDepth12++;
                continue;
              }
              if (at12.kind === "punct" && at12.text === ":") {
                if (ternaryDepth12 > 0) { ternaryDepth12--; continue; }
                hasTypeAnnotation12 = true;
                break;
              }
            }
            if (hasTypeAnnotation12) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const callSep12 = isOpt12 ? "?." : "";
          const warnStart12 = hasNew12 ? prev12!.start : tok.start;
          const loc12 = locationOf(src, warnStart12);
          warnings.push({
            code: "SYN012",
            severity: "warning",
            file: null,
            line: loc12.line,
            column: loc12.column,
            start: warnStart12,
            end: callTok12.start + 1,
            message:
              `fn '${decl.name}' ${hasNew12 ? "constructs new " : "calls "}EventSource${callSep12}() — ` +
              `EventSource opens a server-sent-events connection invisible to the capability model; ` +
              `wrap in unsafe "wraps EventSource for <reason>" { ${hasNew12 ? "new " : ""}EventSource${isOpt12 ? "?." : ""}(url) }`,
            rule: syn012.rule,
            idiom: syn012.idiom,
            rewrite: syn012.rewrite,
          });
          break;
        }

        // ── SYN013: new Worker() / new SharedWorker() ───────────────────────
        case "Worker":
        case "SharedWorker": {
          // Exclude: `obj.Worker(...)` — preceded by `.` or `?.`
          const prevIdx13 = prevSignificant(tokens, i - 1);
          const prev13 = tokens[prevIdx13];
          if (prev13 && ((prev13.kind === "punct" && prev13.text === ".") || prev13.kind === "questionDot"))
            continue;

          // Exclude: function/fn/function* declarations named Worker/SharedWorker
          if (prev13 && prev13.kind === "ident" && prev13.text === "function") continue;
          if (prev13 && prev13.kind === "keyword" && prev13.text === "fn") continue;
          // Generator: `function* Worker` — prev token is `*` (operator kind), token before that is `function`
          if (prev13 && prev13.kind === "operator" && prev13.text === "*") {
            const prevPrevIdx13 = prevSignificant(tokens, prevIdx13 - 1);
            const prevPrev13 = tokens[prevPrevIdx13];
            if (prevPrev13 && prevPrev13.kind === "ident" && prevPrev13.text === "function") continue;
          }

          const hasNew13 = prev13 && prev13.kind === "ident" && prev13.text === "new";
          // Ternary guard: `cond ? new Worker(url) : other`
          const prevBeforeNew13 = hasNew13
            ? tokens[prevSignificant(tokens, prevIdx13 - 1)]
            : undefined;
          const isTernaryConsequent13 =
            (prev13 !== undefined && prev13 !== null && prev13.kind === "question") ||
            (prevBeforeNew13 !== undefined && prevBeforeNew13 !== null && prevBeforeNew13.kind === "question");

          const nextIdx13 = nextSignificant(tokens, i + 1);
          const next13 = tokens[nextIdx13];

          let isOpt13 = false;
          let callIdx13 = nextIdx13;

          if (next13 && next13.kind === "questionDot") {
            // Worker?.( — optional call
            isOpt13 = true;
            callIdx13 = nextSignificant(tokens, nextIdx13 + 1);
          } else if (hasNew13 && next13 && next13.kind === "operator" && next13.text === "<") {
            // new Worker<T>( — generic scan only when `new` precedes
            let depth = 1;
            let j = nextIdx13 + 1;
            while (j < tokens.length && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth = Math.max(0, depth - t.text.length);
              j++;
            }
            callIdx13 = nextSignificant(tokens, j);
          }

          let callTok13 = tokens[callIdx13];
          if (!callTok13 || !(callTok13.kind === "open" && callTok13.text === "(")) {
            const parenIdx13 = resolveParenGroupedCallIdx(tokens, i);
            if (parenIdx13 === null) continue;
            callIdx13 = parenIdx13;
            callTok13 = tokens[callIdx13]!;
          }

          // Exclude method shorthands and TS method signatures: { Worker(url) { } } / { Worker(url): T; }
          if (callTok13.matchedAt !== undefined) {
            const afterCloseIdx13 = nextSignificant(tokens, callTok13.matchedAt + 1);
            const afterClose13 = tokens[afterCloseIdx13];
            if (afterClose13 && (
              (afterClose13.kind === "open" && afterClose13.text === "{") ||
              afterClose13.kind === "fatArrow" ||
              (!isTernaryConsequent13 && afterClose13.kind === "punct" && afterClose13.text === ":")
            )) continue;
            // Exclude TS method signatures with omitted return type:
            // `{ Worker(url: string) }` — a `:` at depth 0 inside the parens.
            // Also handles optional params: `{ Worker(url?: string) }`.
            let hasTypeAnnotation13 = false;
            let depth13 = 0;
            let ternaryDepth13 = 0;
            for (let k13 = callIdx13 + 1; k13 < callTok13.matchedAt; k13++) {
              const at13 = tokens[k13];
              if (!at13) continue;
              if (at13.kind === "open") { depth13++; continue; }
              if (at13.kind === "close") { depth13--; continue; }
              if (depth13 !== 0) continue;
              if (at13.kind === "question") {
                // `?:` is an optional-parameter marker, not a ternary — peek ahead
                const nextAfterQ13 = nextSignificant(tokens, k13 + 1);
                const nextTokQ13 = tokens[nextAfterQ13];
                if (nextTokQ13 && nextTokQ13.kind === "punct" && nextTokQ13.text === ":") {
                  hasTypeAnnotation13 = true;
                  break;
                }
                ternaryDepth13++;
                continue;
              }
              if (at13.kind === "punct" && at13.text === ":") {
                if (ternaryDepth13 > 0) { ternaryDepth13--; continue; }
                hasTypeAnnotation13 = true;
                break;
              }
            }
            if (hasTypeAnnotation13) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const workerName13 = tok.text;
          const warnStart13 = hasNew13 ? prev13!.start : tok.start;
          const loc13 = locationOf(src, warnStart13);
          warnings.push({
            code: "SYN013",
            severity: "warning",
            file: null,
            line: loc13.line,
            column: loc13.column,
            start: warnStart13,
            end: callTok13.start + 1,
            message:
              `fn '${decl.name}' ${hasNew13 ? "constructs new " : "calls "}${workerName13}${isOpt13 ? "?." : ""}() — ` +
              `${workerName13} spawns a new execution context with an unbounded capability surface invisible to the capability model; ` +
              `wrap in unsafe "<reason>" { ${hasNew13 ? "new " : ""}${workerName13}${isOpt13 ? "?." : ""}(scriptURL) }`,
            rule: syn013.rule,
            idiom: syn013.idiom,
            rewrite: syn013.rewrite,
          });
          break;
        }

        // ── SYN014: new BroadcastChannel() / BroadcastChannel() ─────────────
        case "BroadcastChannel": {
          const prevIdx14 = prevSignificant(tokens, i - 1);
          const prev14 = tokens[prevIdx14];

          // Exclude: `obj.BroadcastChannel(...)` — preceded by `.` or `?.`
          if (prev14 && ((prev14.kind === "punct" && prev14.text === ".") || prev14.kind === "questionDot"))
            continue;

          // Exclude: function/fn/function* declarations named BroadcastChannel
          if (prev14 && prev14.kind === "ident" && prev14.text === "function") continue;
          if (prev14 && prev14.kind === "keyword" && prev14.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx14)) continue;

          // Must be followed by `(` or `?.(` — or `<T>(` when preceded by `new`
          // (generic scan is gated on `new` to avoid `<`/`>` comparison false-positives).
          const nextIdx14 = nextSignificant(tokens, i + 1);
          const next14 = tokens[nextIdx14];

          let callIdx14 = nextIdx14;
          let isOpt14 = false;
          if (next14 && next14.kind === "questionDot") {
            isOpt14 = true;
            callIdx14 = nextSignificant(tokens, nextIdx14 + 1);
          }

          // TypeScript generic instantiation: `new BroadcastChannel<T>(name)`
          let afterGenericIdx14 = callIdx14;
          if (!isOpt14 && next14 && next14.kind === "operator" && next14.text === "<") {
            const hasNew14 = prev14 && prev14.kind === "ident" && prev14.text === "new";
            if (hasNew14) {
              let depth14 = 1;
              let j14 = nextIdx14 + 1;
              while (j14 < decl.tokenEnd && depth14 > 0) {
                const at14 = tokens[j14];
                if (!at14) { j14++; continue; }
                if (at14.kind === "operator" && at14.text === "<") depth14++;
                else if (at14.kind === "operator" && (at14.text === ">" || at14.text === ">>" || at14.text === ">>>"))
                  depth14 = Math.max(0, depth14 - at14.text.length);
                j14++;
              }
              afterGenericIdx14 = nextSignificant(tokens, j14);
              callIdx14 = afterGenericIdx14;
            }
          }

          let callTok14 = tokens[callIdx14];
          if (!callTok14 || !(callTok14.kind === "open" && callTok14.text === "(")) {
            const parenIdx14 = resolveParenGroupedCallIdx(tokens, i);
            if (parenIdx14 === null) continue;
            callIdx14 = parenIdx14;
            callTok14 = tokens[callIdx14]!;
          }

          // Exclude method shorthands and TS method signatures.
          // Guard `:` check against ternary consequents.
          const prevBeforeNew14 = (prev14 && prev14.kind === "ident" && prev14.text === "new")
            ? tokens[prevSignificant(tokens, prevIdx14 - 1)]
            : undefined;
          const isTernaryConsequent14 = (prev14 && prev14.kind === "question") ||
            (prevBeforeNew14 !== undefined && prevBeforeNew14 !== null && prevBeforeNew14.kind === "question");
          if (callTok14.matchedAt !== undefined) {
            const afterCloseIdx14 = nextSignificant(tokens, callTok14.matchedAt + 1);
            const afterClose14 = tokens[afterCloseIdx14];
            if (afterClose14 && (
              (afterClose14.kind === "open" && afterClose14.text === "{") ||
              afterClose14.kind === "fatArrow" ||
              (!isTernaryConsequent14 && afterClose14.kind === "punct" && afterClose14.text === ":")
            )) continue;
            // Exclude TS method signatures with omitted return type:
            // `{ BroadcastChannel(name: string) }` — no `{`, `=>`, or `:` after `)`,
            // but a `:` at depth 0 inside the parens that isn't part of a ternary.
            // Also handles optional params: `{ BroadcastChannel(name?: string) }`.
            let hasTypeAnnotation14 = false;
            let depth14 = 0;
            let ternaryDepth14 = 0;
            for (let k14 = callIdx14 + 1; k14 < callTok14.matchedAt; k14++) {
              const at14 = tokens[k14];
              if (!at14) continue;
              if (at14.kind === "open") { depth14++; continue; }
              if (at14.kind === "close") { depth14--; continue; }
              if (depth14 !== 0) continue;
              if (at14.kind === "question") {
                // `?:` is an optional-parameter marker, not a ternary — peek ahead
                const nextAfterQ14 = nextSignificant(tokens, k14 + 1);
                const nextTokQ14 = tokens[nextAfterQ14];
                if (nextTokQ14 && nextTokQ14.kind === "punct" && nextTokQ14.text === ":") {
                  hasTypeAnnotation14 = true;
                  break;
                }
                ternaryDepth14++;
                continue;
              }
              if (at14.kind === "punct" && at14.text === ":") {
                if (ternaryDepth14 > 0) { ternaryDepth14--; continue; }
                hasTypeAnnotation14 = true;
                break;
              }
            }
            if (hasTypeAnnotation14) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const hasNew14 = prev14 && prev14.kind === "ident" && prev14.text === "new";
          const callSep14 = isOpt14 ? "?." : "";
          const warnStart14 = hasNew14 ? prev14!.start : tok.start;
          const loc14 = locationOf(src, warnStart14);
          warnings.push({
            code: "SYN014",
            severity: "warning",
            file: null,
            line: loc14.line,
            column: loc14.column,
            start: warnStart14,
            end: callTok14.start + 1,
            message:
              `fn '${decl.name}' ${hasNew14 ? "constructs new " : "calls "}BroadcastChannel${callSep14}() — ` +
              `BroadcastChannel opens a cross-context message channel any same-origin tab or worker can post to, ` +
              `invisible to the capability model; wrap in unsafe "<reason>" { ${hasNew14 ? "new " : ""}BroadcastChannel${callSep14}(name) }`,
            rule: syn014.rule,
            idiom: syn014.idiom,
            rewrite: syn014.rewrite,
          });
          break;
        }

        // ── SYN015: localStorage.* / sessionStorage.* access ─────────────────
        case "localStorage":
        case "sessionStorage": {
          // Exclude: `obj.localStorage` / `obj.sessionStorage` — preceded by `.` or `?.`
          const prevIdx15 = prevSignificant(tokens, i - 1);
          const prev15 = tokens[prevIdx15];
          if (prev15 && ((prev15.kind === "punct" && prev15.text === ".") || prev15.kind === "questionDot"))
            continue;

          // Exclude: fn/function/function* declarations named localStorage or sessionStorage
          if (prev15 && prev15.kind === "keyword" && prev15.text === "fn") continue;
          if (prev15 && prev15.kind === "ident" && prev15.text === "function") continue;
          if (isFunctionStarDecl(tokens, prevIdx15)) continue;

          // Must be followed by `.` or `?.` — confirming access on the global, not a bare reference
          let nextIdx15 = nextSignificant(tokens, i + 1);
          let next15 = tokens[nextIdx15];
          // Paren-receiver bypass: `(localStorage).getItem()` — resolve through paren group.
          const parenDotIdx15 = resolveParenGroupedMemberReceiverIdx(tokens, i);
          if (parenDotIdx15 !== null) { nextIdx15 = parenDotIdx15; next15 = tokens[nextIdx15]; }
          const isDot15 = next15 && next15.kind === "punct" && next15.text === ".";
          const isOptChain15 = next15 && next15.kind === "questionDot";
          if (!isDot15 && !isOptChain15) continue;

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const sep15 = isOptChain15 ? "?." : ".";
          const loc15 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN015",
            severity: "warning",
            file: null,
            line: loc15.line,
            column: loc15.column,
            start: tok.start,
            end: next15!.end,
            message:
              `fn '${decl.name}' accesses ${tok.text}${sep15} — ` +
              `${tok.text} is a Web Storage API global invisible to the capability model; ` +
              `no reads {} / writes {} label covers it; ` +
              `pass a storage abstraction as a parameter or wrap in unsafe "accesses ${tok.text} for <reason>" { ${tok.text}.setItem(key, val) }`,
            rule: syn015.rule,
            idiom: syn015.idiom,
            rewrite: syn015.rewrite,
          });
          break;
        }

        // ── SYN016: indexedDB.* access ───────────────────────────────────────
        case "indexedDB": {
          // Exclude: `obj.indexedDB` — preceded by `.` or `?.`
          const prevIdx16 = prevSignificant(tokens, i - 1);
          const prev16 = tokens[prevIdx16];
          if (prev16 && ((prev16.kind === "punct" && prev16.text === ".") || prev16.kind === "questionDot"))
            continue;

          // Exclude: fn/function/function* declarations named indexedDB
          if (prev16 && prev16.kind === "keyword" && prev16.text === "fn") continue;
          if (prev16 && prev16.kind === "ident" && prev16.text === "function") continue;
          if (isFunctionStarDecl(tokens, prevIdx16)) continue;

          // Must be followed by `.` or `?.` — confirming this is an access on the global, not a bare reference
          let nextIdx16 = nextSignificant(tokens, i + 1);
          let next16 = tokens[nextIdx16];
          // Paren-receiver bypass: `(indexedDB).open()` — resolve through paren group.
          const parenDotIdx16 = resolveParenGroupedMemberReceiverIdx(tokens, i);
          if (parenDotIdx16 !== null) { nextIdx16 = parenDotIdx16; next16 = tokens[nextIdx16]; }
          const isDot16 = next16 && next16.kind === "punct" && next16.text === ".";
          const isOptChain16 = next16 && next16.kind === "questionDot";
          if (!isDot16 && !isOptChain16) continue;

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const sep16 = isOptChain16 ? "?." : ".";
          const loc16 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN016",
            severity: "warning",
            file: null,
            line: loc16.line,
            column: loc16.column,
            start: tok.start,
            end: next16!.end,
            message:
              `fn '${decl.name}' accesses indexedDB${sep16} — ` +
              `indexedDB is persistent same-origin database storage invisible to the capability model; ` +
              `no reads {} / writes {} label covers it; ` +
              `pass a database handle as a parameter or wrap in unsafe "accesses indexedDB for <reason>" { indexedDB.open(name) }`,
            rule: syn016.rule,
            idiom: syn016.idiom,
            rewrite: syn016.rewrite,
          });
          break;
        }

        // ── SYN017: new Notification() / Notification() call ─────────────────
        case "Notification": {
          // Exclude: `obj.Notification(...)` — preceded by `.` or `?.`
          const prevIdx17 = prevSignificant(tokens, i - 1);
          const prev17 = tokens[prevIdx17];
          if (prev17 && ((prev17.kind === "punct" && prev17.text === ".") || prev17.kind === "questionDot"))
            continue;

          // Exclude: function/fn/function* declarations named Notification
          if (prev17 && prev17.kind === "ident" && prev17.text === "function") continue;
          if (prev17 && prev17.kind === "keyword" && prev17.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx17)) continue;

          const hasNew17 = prev17 && prev17.kind === "ident" && prev17.text === "new";
          // Ternary guard: `cond ? Notification(title) : other`, `cond ? new Notification(title) : other`,
          // `cond ? await Notification(title) : other`, `cond ? await new Notification(title) : other`
          const prevBeforeNew17 = hasNew17
            ? tokens[prevSignificant(tokens, prevIdx17 - 1)]
            : undefined;
          // Look through `await` between ternary `?` and the call/construction
          const awaitIdx17 = (!hasNew17 && prev17 && prev17.kind === "ident" && prev17.text === "await")
            ? prevIdx17
            : (prevBeforeNew17 && prevBeforeNew17.kind === "ident" && prevBeforeNew17.text === "await")
              ? prevSignificant(tokens, prevIdx17 - 1)
              : -1;
          const prevBeforeAwait17 = awaitIdx17 >= 0 ? tokens[prevSignificant(tokens, awaitIdx17 - 1)] : undefined;
          const isTernaryConsequent17 =
            (prev17 !== undefined && prev17 !== null && prev17.kind === "question") ||
            (prevBeforeNew17 !== undefined && prevBeforeNew17 !== null && prevBeforeNew17.kind === "question") ||
            (prevBeforeAwait17 !== undefined && prevBeforeAwait17 !== null && prevBeforeAwait17.kind === "question");

          const nextIdx17 = nextSignificant(tokens, i + 1);
          const next17 = tokens[nextIdx17];

          let isOpt17 = false;
          let callIdx17 = nextIdx17;

          if (next17 && next17.kind === "questionDot") {
            // Notification?.( — optional call
            isOpt17 = true;
            callIdx17 = nextSignificant(tokens, nextIdx17 + 1);
          } else if (hasNew17 && next17 && next17.kind === "operator" && next17.text === "<") {
            // new Notification<T>( — generic scan only when `new` precedes
            let depth = 1;
            let j = nextIdx17 + 1;
            while (j < decl.tokenEnd && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth = Math.max(0, depth - t.text.length);
              j++;
            }
            callIdx17 = nextSignificant(tokens, j);
          }

          let callTok17 = tokens[callIdx17];
          if (!callTok17 || !(callTok17.kind === "open" && callTok17.text === "(")) {
            const parenIdx17 = resolveParenGroupedCallIdx(tokens, i);
            if (parenIdx17 === null) continue;
            callIdx17 = parenIdx17;
            callTok17 = tokens[callIdx17]!;
          }

          // Exclude method shorthands and TS method signatures.
          if (callTok17.matchedAt !== undefined) {
            const afterCloseIdx17 = nextSignificant(tokens, callTok17.matchedAt + 1);
            const afterClose17 = tokens[afterCloseIdx17];
            if (afterClose17 && (
              (afterClose17.kind === "open" && afterClose17.text === "{") ||
              afterClose17.kind === "fatArrow" ||
              (!isTernaryConsequent17 && afterClose17.kind === "punct" && afterClose17.text === ":")
            )) continue;
            // Exclude TS method signatures with omitted return type or optional params:
            // `{ Notification(title: string) }` / `{ Notification(title?: string) }`.
            let hasTypeAnnotation17 = false;
            let depth17 = 0;
            let ternaryDepth17 = 0;
            for (let k17 = callIdx17 + 1; k17 < callTok17.matchedAt; k17++) {
              const at17 = tokens[k17];
              if (!at17) continue;
              if (at17.kind === "open") { depth17++; continue; }
              if (at17.kind === "close") { depth17--; continue; }
              if (depth17 !== 0) continue;
              if (at17.kind === "question") {
                const nextAfterQ17 = nextSignificant(tokens, k17 + 1);
                const nextTokQ17 = tokens[nextAfterQ17];
                if (nextTokQ17 && nextTokQ17.kind === "punct" && nextTokQ17.text === ":") {
                  hasTypeAnnotation17 = true;
                  break;
                }
                ternaryDepth17++;
                continue;
              }
              if (at17.kind === "punct" && at17.text === ":") {
                if (ternaryDepth17 > 0) { ternaryDepth17--; continue; }
                hasTypeAnnotation17 = true;
                break;
              }
            }
            if (hasTypeAnnotation17) continue;

            // Exclude TS type-literal method signatures with no annotations at all:
            // `{ Notification() }`, `{ x: string; Notification() }`, `{ Notification(); }` etc.
            // Only applies to empty-parens forms — annotated params are handled by hasTypeAnnotation17
            // above. The token after `)` may be `}` directly, or a separator then `}`.
            // Conditions: (a) parens are empty (no significant tokens between `(` and `)`),
            //             (b) enclosing `{` is in a type context (preceded by `=` or `:`),
            //             (c) `Notification` is at a method-signature position: either the first
            //                 significant token inside the `{`, or preceded by `;` / `,`
            //                 (subsequent type member, e.g. `{ x: string; Notification() }`).
            {
              const isEmptyParens17 = nextSignificant(tokens, callIdx17 + 1) >= (callTok17.matchedAt as number);
              if (isEmptyParens17) {
                let closeBrace17 = afterClose17;
                if (closeBrace17 &&
                    closeBrace17.kind === "punct" &&
                    (closeBrace17.text === ";" || closeBrace17.text === ",")) {
                  const nextAfterSepIdx17 = nextSignificant(tokens, afterCloseIdx17 + 1);
                  closeBrace17 = tokens[nextAfterSepIdx17];
                }
                if (closeBrace17 && closeBrace17.kind === "close" && closeBrace17.text === "}" &&
                    closeBrace17.matchedAt !== undefined) {
                  const openBraceIdx17 = closeBrace17.matchedAt;
                  const prevOpenIdx17 = prevSignificant(tokens, openBraceIdx17 - 1);
                  const prevOpen17 = tokens[prevOpenIdx17];
                  const firstInsideBraceIdx17 = nextSignificant(tokens, openBraceIdx17 + 1);
                  // Method-signature position: first token in the type literal, or preceded by
                  // a member separator (handles `{ x: string; Notification() }` etc.)
                  const isAtMemberPos17 =
                    firstInsideBraceIdx17 === i ||
                    (prev17 && prev17.kind === "punct" && (prev17.text === ";" || prev17.text === ","));
                  if (isAtMemberPos17 && prevOpen17 && (
                    prevOpen17.kind === "eq" ||                                       // type T = { ... }
                    (prevOpen17.kind === "punct" && prevOpen17.text === ":") ||       // x: { ... }
                    (prevOpen17.kind === "operator" && (                              // intersection / union / generic
                      prevOpen17.text === "&" ||                                     //   Foo & { ... }
                      prevOpen17.text === "|" ||                                     //   Foo | { ... }
                      prevOpen17.text === "<"                                        //   Foo<{ ... }>
                    )) ||
                    (prevOpen17.kind === "punct" && prevOpen17.text === ",") ||      //   Foo<Bar, { ... }> — non-first type arg
                    (prevOpen17.kind === "ident" && (                                // keyword-led type positions
                      prevOpen17.text === "as" ||                                    //   x as { ... }
                      prevOpen17.text === "extends" ||                               //   T extends { ... }
                      prevOpen17.text === "satisfies"                               //   x satisfies { ... }
                    ))
                  )) continue;
                }
              }
            }
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const callSep17 = isOpt17 ? "?." : "";
          const warnStart17 = hasNew17 ? prev17!.start : tok.start;
          const loc17 = locationOf(src, warnStart17);
          warnings.push({
            code: "SYN017",
            severity: "warning",
            file: null,
            line: loc17.line,
            column: loc17.column,
            start: warnStart17,
            end: callTok17.start + 1,
            message:
              `fn '${decl.name}' ${hasNew17 ? "constructs new " : "calls "}Notification${callSep17}() — ` +
              `Notification fires a user-visible browser notification invisible to the capability model; ` +
              `wrap in unsafe "sends browser notification for <reason>" { ${hasNew17 ? "new " : ""}Notification${callSep17}(...) }`,
            rule: syn017.rule,
            idiom: syn017.idiom,
            rewrite: syn017.rewrite,
          });
          break;
        }

        // ── SYN018: Math.random() ────────────────────────────────────────────
        case "Math": {
          // Exclude: `obj.Math.random(...)` — Math preceded by `.` or `?.`
          const prevIdx18 = prevSignificant(tokens, i - 1);
          const prev18 = tokens[prevIdx18];
          if (prev18 && ((prev18.kind === "punct" && prev18.text === ".") || prev18.kind === "questionDot"))
            continue;

          // Must be followed by `.` or `?.`
          let nextIdx18 = nextSignificant(tokens, i + 1);
          let next18 = tokens[nextIdx18];
          // Paren-receiver bypass: `(Math).random()` — resolve through paren group.
          const parenDotIdx18 = resolveParenGroupedMemberReceiverIdx(tokens, i);
          if (parenDotIdx18 !== null) { nextIdx18 = parenDotIdx18; next18 = tokens[nextIdx18]; }
          const isDot18 = next18 && next18.kind === "punct" && next18.text === ".";
          const isOptChain18 = next18 && next18.kind === "questionDot";
          if (!isDot18 && !isOptChain18) continue;

          // Member must be `random`
          const memberIdx18 = nextSignificant(tokens, nextIdx18 + 1);
          const memberTok18 = tokens[memberIdx18];
          if (!memberTok18 || memberTok18.kind !== "ident" || memberTok18.text !== "random") continue;

          // Must be a call: next after `random` is `(` or `?.(`
          let afterRandomIdx18 = nextSignificant(tokens, memberIdx18 + 1);
          let afterRandom18 = tokens[afterRandomIdx18];
          let isOptCall18 = false;
          if (afterRandom18 && afterRandom18.kind === "questionDot") {
            isOptCall18 = true;
            afterRandomIdx18 = nextSignificant(tokens, afterRandomIdx18 + 1);
            afterRandom18 = tokens[afterRandomIdx18];
          }
          if (!afterRandom18 || !(afterRandom18.kind === "open" && afterRandom18.text === "(")) continue;

          if (isInsideRange(memberTok18.start, unsafeRanges)) continue;

          const sep18 = isOptChain18 ? "?." : ".";
          const callSep18 = isOptCall18 ? "?." : "";
          const loc18 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN018",
            severity: "warning",
            file: null,
            line: loc18.line,
            column: loc18.column,
            start: tok.start,
            end: memberTok18.end,
            message:
              `fn '${decl.name}' calls Math${sep18}random${callSep18}() — ` +
              `Math.random is invisible to the capability model; use random.next() with uses { random } ` +
              `so tests can control the output, or wrap in unsafe "uses Math.random for <reason>" { Math.random() }`,
            rule: syn018.rule,
            idiom: syn018.idiom,
            rewrite: syn018.rewrite,
          });
          break;
        }

        // ── SYN019: crypto.getRandomValues() / crypto.randomUUID() ───────────
        case "crypto": {
          // Exclude: `obj.crypto` — preceded by `.` or `?.`
          const prevIdx19 = prevSignificant(tokens, i - 1);
          const prev19 = tokens[prevIdx19];
          if (prev19 && ((prev19.kind === "punct" && prev19.text === ".") || prev19.kind === "questionDot"))
            continue;

          // Exclude: fn/function/function* declarations named crypto
          if (prev19 && prev19.kind === "keyword" && prev19.text === "fn") continue;
          if (prev19 && prev19.kind === "ident" && prev19.text === "function") continue;
          if (isFunctionStarDecl(tokens, prevIdx19)) continue;

          // Must be followed by `.` or `?.`
          let nextIdx19 = nextSignificant(tokens, i + 1);
          let next19 = tokens[nextIdx19];
          // Paren-receiver bypass: `(crypto).getRandomValues()` — resolve through paren group.
          const parenDotIdx19 = resolveParenGroupedMemberReceiverIdx(tokens, i);
          if (parenDotIdx19 !== null) { nextIdx19 = parenDotIdx19; next19 = tokens[nextIdx19]; }
          const isDot19 = next19 && next19.kind === "punct" && next19.text === ".";
          const isOptChain19 = next19 && next19.kind === "questionDot";
          if (!isDot19 && !isOptChain19) continue;

          // Next token after the dot must be `getRandomValues` or `randomUUID`
          const methodIdx19 = nextSignificant(tokens, nextIdx19 + 1);
          const method19 = tokens[methodIdx19];
          if (!method19 || method19.kind !== "ident") continue;
          if (method19.text !== "getRandomValues" && method19.text !== "randomUUID") continue;

          // Confirm it's a call: next token is `(` or `?.(`
          let callIdx19 = nextSignificant(tokens, methodIdx19 + 1);
          let callTok19 = tokens[callIdx19];
          let isOptCall19 = false;
          if (callTok19 && callTok19.kind === "questionDot") {
            isOptCall19 = true;
            callIdx19 = nextSignificant(tokens, callIdx19 + 1);
            callTok19 = tokens[callIdx19];
          }
          if (!callTok19 || !(callTok19.kind === "open" && callTok19.text === "(")) continue;

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const sep19 = isOptChain19 ? "?." : ".";
          const callSep19 = isOptCall19 ? "?." : "";
          const methodName19 = method19.text;
          const argSuffix19 = methodName19 === "getRandomValues" ? "(buf)" : "()";
          const callForm19 = `crypto${sep19}${methodName19}${callSep19}${argSuffix19}`;
          const loc19 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN019",
            severity: "warning",
            file: null,
            line: loc19.line,
            column: loc19.column,
            start: tok.start,
            end: callTok19.start + 1,
            message:
              `fn '${decl.name}' calls ${callForm19} — ` +
              `crypto.getRandomValues and crypto.randomUUID generate cryptographic randomness invisible to the capability model; ` +
              `uses { random } does not cover the crypto global; ` +
              `use random.next() or random.int() from the random stdlib with uses { random } so callers see the dependency and tests can control the output; ` +
              `for crypto-specific needs (cryptographic randomness, UUIDs) wrap in unsafe "uses crypto for <reason>" { ${callForm19} }`,
            rule: syn019.rule,
            idiom: syn019.idiom,
            rewrite: syn019.rewrite,
          });
          break;
        }

        // ── SYN020: Date.now() / new Date() / Date() — ambient time dependency ─
        case "Date": {
          // Exclude: `obj.Date` — preceded by `.` or `?.`
          const prevIdx20 = prevSignificant(tokens, i - 1);
          const prev20 = tokens[prevIdx20];
          if (prev20 && ((prev20.kind === "punct" && prev20.text === ".") || prev20.kind === "questionDot"))
            continue;

          // Exclude: fn/function/function* declarations named Date
          if (prev20 && prev20.kind === "keyword" && prev20.text === "fn") continue;
          if (prev20 && prev20.kind === "ident" && prev20.text === "function") continue;
          if (isFunctionStarDecl(tokens, prevIdx20)) continue;

          const hasNew20 = prev20 && prev20.kind === "ident" && prev20.text === "new";

          let nextIdx20 = nextSignificant(tokens, i + 1);
          let next20 = tokens[nextIdx20];
          // Paren-receiver bypass: `(Date).now()` — resolve through paren group (Pattern 1 only).
          if (!hasNew20) {
            const parenDotIdx20 = resolveParenGroupedMemberReceiverIdx(tokens, i);
            if (parenDotIdx20 !== null) { nextIdx20 = parenDotIdx20; next20 = tokens[nextIdx20]; }
          }

          // ── Pattern 1: Date.now() / Date?.now() ──────────────────────────
          // Followed by `.` or `?.`, then `now`, then `(` or `?.(`.
          const isDotNext20 = next20 && next20.kind === "punct" && next20.text === ".";
          const isOptChain20 = next20 && next20.kind === "questionDot";
          if (isDotNext20 || isOptChain20) {
            const memberIdx20 = nextSignificant(tokens, nextIdx20 + 1);
            const memberTok20 = tokens[memberIdx20];
            // Only enter Pattern 1 when the member is `now`.
            // `Date?.()` has `?.` followed directly by `(` — fall through to Pattern 2.
            if (!memberTok20 || memberTok20.kind !== "ident" || memberTok20.text !== "now") {
              // `.xxx` that isn't `.now` is not an ambient-time call (e.g. Date.parse).
              // `?.xxx` that isn't `?.now` — still not ambient time, except `Date?.()` where
              // the `(` appears as member. That is handled below in Pattern 2 (next20 === `?.`).
              if (isDotNext20) continue;
              // isOptChain20 && member isn't `now`: fall through to Pattern 2.
            } else {
              // Confirm call: next after `now` is `(` or `?.(`
              let afterNowIdx20 = nextSignificant(tokens, memberIdx20 + 1);
              let afterNow20 = tokens[afterNowIdx20];
              let isOptCall20 = false;
              if (afterNow20 && afterNow20.kind === "questionDot") {
                isOptCall20 = true;
                afterNowIdx20 = nextSignificant(tokens, afterNowIdx20 + 1);
                afterNow20 = tokens[afterNowIdx20];
              }
              if (!afterNow20 || !(afterNow20.kind === "open" && afterNow20.text === "(")) continue;
              if (isInsideRange(tok.start, unsafeRanges)) continue;

              const sep20 = isOptChain20 ? "?." : ".";
              const callSep20 = isOptCall20 ? "?." : "";
              const loc20 = locationOf(src, tok.start);
              warnings.push({
                code: "SYN020",
                severity: "warning",
                file: null,
                line: loc20.line,
                column: loc20.column,
                start: tok.start,
                end: afterNow20.start + 1,
                message:
                  `fn '${decl.name}' calls Date${sep20}now${callSep20}() — ` +
                  `Date.now() injects the current time invisible to the capability model; ` +
                  `pass nowMs as a parameter or use time.now() with uses { time }, ` +
                  `or wrap in unsafe "uses current time for <reason>" { Date.now() }`,
                rule: syn020.rule,
                idiom: syn020.idiom,
                rewrite: syn020.rewrite,
              });
              break;
            }
          }

          // ── Pattern 3: new Date (no parentheses) ─────────────────────────
          // In JS/TS `new Date` without parens is equivalent to `new Date()` — ambient time injection.
          if (hasNew20 && (
            !next20 ||
            (next20.kind !== "open" &&
             next20.kind !== "questionDot" &&
             !(next20.kind === "operator" && next20.text === "<") &&
             !(next20.kind === "punct" && next20.text === "."))
          )) {
            if (isInsideRange(tok.start, unsafeRanges)) { break; }
            const loc20c = locationOf(src, prev20!.start);
            warnings.push({
              code: "SYN020",
              severity: "warning",
              file: null,
              line: loc20c.line,
              column: loc20c.column,
              start: prev20!.start,
              end: tok.end,
              message:
                `fn '${decl.name}' constructs new Date (no-paren form) — ` +
                `new Date without parentheses is equivalent to new Date() and injects the current time invisible to the capability model; ` +
                `pass nowMs as a parameter (time.now() with uses { time } gives epoch ms, not a Date object), ` +
                `or wrap in unsafe "uses current time for <reason>" { new Date }`,
              rule: syn020.rule,
              idiom: syn020.idiom,
              rewrite: syn020.rewrite,
            });
            break;
          }

          // ── Pattern 2: new Date() / Date(...) / new Date<T>() ────────────
          // Check: followed by `(`, `?.(`, or (when `new`) `<T>(`.
          // `new Date(arg)` with explicit args is excluded (constructs a specific date, not ambient time).
          // `Date(arg)` without `new` ignores args and always returns the current date string — always fires.
          let callIdx20 = nextIdx20;
          let isOpt20 = false;

          if (next20 && next20.kind === "questionDot") {
            // Date?.( — optional bare call
            isOpt20 = true;
            callIdx20 = nextSignificant(tokens, nextIdx20 + 1);
          } else if (hasNew20 && next20 && next20.kind === "operator" && next20.text === "<") {
            // new Date<T>( — generic scan only when `new` precedes (avoids comparison false-positives)
            let depth = 1;
            let j = nextIdx20 + 1;
            while (j < decl.tokenEnd && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth = Math.max(0, depth - t.text.length);
              j++;
            }
            callIdx20 = nextSignificant(tokens, j);
          }

          const callTok20 = tokens[callIdx20];
          if (!callTok20 || !(callTok20.kind === "open" && callTok20.text === "(")) continue;

          // Exclude method shorthands and TS method signatures: `{ Date(str): T; }`
          // Guard against ternary consequents: `cond ? Date(str) : other`
          // Also handles `await`-wrapped forms: `cond ? await Date() : other`
          const prevBeforeNewIdx20 = hasNew20 ? prevSignificant(tokens, prevIdx20 - 1) : -1;
          const prevBeforeNew20 = prevBeforeNewIdx20 >= 0 ? tokens[prevBeforeNewIdx20] : undefined;
          // Look through `await` one level to detect ternary position
          const awaitSkipPrev20 = (prev20 && prev20.kind === "ident" && prev20.text === "await")
            ? tokens[prevSignificant(tokens, prevIdx20 - 1)] : undefined;
          const awaitSkipPrevBeforeNew20 = (prevBeforeNew20 && prevBeforeNew20.kind === "ident" && prevBeforeNew20.text === "await")
            ? tokens[prevSignificant(tokens, prevBeforeNewIdx20 - 1)] : undefined;
          const isTernary20 = prev20?.kind === "question" ||
            prevBeforeNew20?.kind === "question" ||
            awaitSkipPrev20?.kind === "question" ||
            awaitSkipPrevBeforeNew20?.kind === "question";
          if (callTok20.matchedAt !== undefined) {
            const afterCloseIdx20 = nextSignificant(tokens, callTok20.matchedAt + 1);
            const afterClose20 = tokens[afterCloseIdx20];
            if (afterClose20 && (
              (afterClose20.kind === "open" && afterClose20.text === "{") ||
              afterClose20.kind === "fatArrow" ||
              (!isTernary20 && afterClose20.kind === "punct" && afterClose20.text === ":")
            )) continue;
            // Exclude TS method signatures with omitted return type: `{ Date(x: string) }`.
            // A `:` at depth 0 inside the parens is a type annotation — not an ambient-time call.
            // Also handles optional params: `{ Date(x?: string) }`.
            let hasTypeAnnotation20 = false;
            let depth20 = 0;
            let ternaryDepth20 = 0;
            for (let k20 = callIdx20 + 1; k20 < callTok20.matchedAt; k20++) {
              const at20 = tokens[k20];
              if (!at20) continue;
              if (at20.kind === "open") { depth20++; continue; }
              if (at20.kind === "close") { depth20--; continue; }
              if (depth20 !== 0) continue;
              if (at20.kind === "question") {
                const nextAfterQ20 = nextSignificant(tokens, k20 + 1);
                const nextTokQ20 = tokens[nextAfterQ20];
                if (nextTokQ20 && nextTokQ20.kind === "punct" && nextTokQ20.text === ":") {
                  hasTypeAnnotation20 = true;
                  break;
                }
                ternaryDepth20++;
                continue;
              }
              if (at20.kind === "punct" && at20.text === ":") {
                if (ternaryDepth20 > 0) { ternaryDepth20--; continue; }
                hasTypeAnnotation20 = true;
                break;
              }
            }
            if (hasTypeAnnotation20) continue;
          }

          // `new Date(arg)` with arguments constructs a specific date — not ambient time; skip.
          // `Date(arg)` (without `new`) always returns the current date string regardless of args; fire.
          const firstInsideIdx20 = nextSignificant(tokens, callIdx20 + 1);
          if (hasNew20 && firstInsideIdx20 !== callTok20.matchedAt) continue; // new Date(arg) → skip

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const warnStart20 = hasNew20 ? prev20!.start : tok.start;
          const loc20b = locationOf(src, warnStart20);
          // Bare `Date(arg)` ignores args and always returns current date string — show `Date(...)` when args present.
          const hasDateArgs20 = !hasNew20 && firstInsideIdx20 !== callTok20.matchedAt;
          const callForm20 = hasNew20 ? "new Date()" : isOpt20 ? (hasDateArgs20 ? "Date?.(...)" : "Date?.()") : (hasDateArgs20 ? "Date(...)" : "Date()");
          const formDesc20 = hasNew20 ? `constructs new Date()` : isOpt20 ? (hasDateArgs20 ? `calls Date?.(...)` : `calls Date?.()`) : (hasDateArgs20 ? `calls Date(...)` : `calls Date()`);
          warnings.push({
            code: "SYN020",
            severity: "warning",
            file: null,
            line: loc20b.line,
            column: loc20b.column,
            start: warnStart20,
            end: callTok20.start + 1,
            message:
              `fn '${decl.name}' ${formDesc20} — ` +
              `${callForm20} injects the current time invisible to the capability model; ` +
              `pass nowMs as a parameter (time.now() with uses { time } gives epoch ms, not a Date object), ` +
              `or wrap in unsafe "uses current time for <reason>" { ${callForm20} }`,
            rule: syn020.rule,
            idiom: syn020.idiom,
            rewrite: syn020.rewrite,
          });
          break;
        }

        // ── SYN021: performance.now() / performance.timeOrigin ───────────────
        case "performance": {
          // Exclude: `obj.performance.*` — performance preceded by `.` or `?.`
          const prevIdx21 = prevSignificant(tokens, i - 1);
          const prev21 = tokens[prevIdx21];
          if (prev21 && ((prev21.kind === "punct" && prev21.text === ".") || prev21.kind === "questionDot"))
            continue;

          // Exclude function declarations: function performance(…), fn performance(…), function* performance(…)
          if (prev21 && prev21.kind === "ident" && prev21.text === "function") continue;
          if (prev21 && prev21.kind === "keyword" && prev21.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx21)) continue;

          // Must be followed by `.` or `?.`
          let nextIdx21 = nextSignificant(tokens, i + 1);
          let next21 = tokens[nextIdx21];
          // Paren-receiver bypass: `(performance).now()` — resolve through paren group.
          const parenDotIdx21 = resolveParenGroupedMemberReceiverIdx(tokens, i);
          if (parenDotIdx21 !== null) { nextIdx21 = parenDotIdx21; next21 = tokens[nextIdx21]; }
          const isDot21 = next21 && next21.kind === "punct" && next21.text === ".";
          const isOptChain21 = next21 && next21.kind === "questionDot";
          if (!isDot21 && !isOptChain21) continue;

          // Member must be `now` or `timeOrigin`
          const memberIdx21 = nextSignificant(tokens, nextIdx21 + 1);
          const memberTok21 = tokens[memberIdx21];
          if (!memberTok21 || memberTok21.kind !== "ident") continue;
          if (memberTok21.text !== "now" && memberTok21.text !== "timeOrigin") continue;

          if (memberTok21.text === "now") {
            // `performance.now` must be followed by a call: `(` or `?.(`
            let afterNowIdx21 = nextSignificant(tokens, memberIdx21 + 1);
            let afterNow21 = tokens[afterNowIdx21];
            let isOptCall21 = false;
            if (afterNow21 && afterNow21.kind === "questionDot") {
              isOptCall21 = true;
              afterNowIdx21 = nextSignificant(tokens, afterNowIdx21 + 1);
              afterNow21 = tokens[afterNowIdx21];
            }
            if (!afterNow21 || !(afterNow21.kind === "open" && afterNow21.text === "(")) continue;

            if (isInsideRange(memberTok21.start, unsafeRanges)) continue;

            const sep21 = isOptChain21 ? "?." : ".";
            const callSep21 = isOptCall21 ? "?." : "";
            const loc21 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN021",
              severity: "warning",
              file: null,
              line: loc21.line,
              column: loc21.column,
              start: tok.start,
              end: afterNow21.start + 1,
              message:
                `fn '${decl.name}' calls performance${sep21}now${callSep21}() — ` +
                `performance.now() injects monotonic time (ms since process start) invisible to the capability model; ` +
                `pass nowMs as a parameter (preferred); ` +
                `note: time.now() is wall-clock epoch time and does NOT replace performance.now() for elapsed-time measurement; ` +
                `or wrap in unsafe "uses performance.now for <reason>" { performance.now() }`,
              rule: syn021.rule,
              idiom: syn021.idiom,
              rewrite: syn021.rewrite,
            });
          } else {
            // `performance.timeOrigin` — property access, no call required
            // Exclude TS method signatures: `{ performance: { timeOrigin: number } }`
            // Guard against ternary consequents: `cond ? performance.timeOrigin : other`
            // (the `:` there belongs to the ternary, not a type annotation)
            // Also handles `await`-wrapped: `cond ? await performance.timeOrigin : other`
            const afterMemberIdx21 = nextSignificant(tokens, memberIdx21 + 1);
            const afterMember21 = tokens[afterMemberIdx21];
            const prevPrevIdx21 = prevSignificant(tokens, prevIdx21 - 1);
            const prevPrev21 = tokens[prevPrevIdx21];
            const isTernaryConsequent21 = (prev21 && prev21.kind === "question") ||
              (prev21 && prev21.kind === "ident" && prev21.text === "await" && prevPrev21?.kind === "question");
            if (!isTernaryConsequent21 && afterMember21 && afterMember21.kind === "punct" && afterMember21.text === ":") continue;

            if (isInsideRange(memberTok21.start, unsafeRanges)) continue;

            const sep21b = isOptChain21 ? "?." : ".";
            const loc21b = locationOf(src, tok.start);
            warnings.push({
              code: "SYN021",
              severity: "warning",
              file: null,
              line: loc21b.line,
              column: loc21b.column,
              start: tok.start,
              end: memberTok21.end,
              message:
                `fn '${decl.name}' reads performance${sep21b}timeOrigin — ` +
                `performance.timeOrigin exposes the epoch of the monotonic clock, invisible to the capability model; ` +
                `pass the origin as a parameter (preferred), ` +
                `or wrap in unsafe "uses performance.timeOrigin for <reason>" { performance.timeOrigin }`,
              rule: syn021.rule,
              idiom: syn021.idiom,
              rewrite: syn021.rewrite,
            });
          }
          break;
        }

        // ── SYN023: navigator.* ambient browser capability ───────────────────
        case "navigator": {
          // Exclude: `obj.navigator.*` — navigator preceded by `.` or `?.`
          const prevIdx23 = prevSignificant(tokens, i - 1);
          const prev23 = tokens[prevIdx23];
          if (prev23 && ((prev23.kind === "punct" && prev23.text === ".") || prev23.kind === "questionDot"))
            continue;

          // Exclude: fn/function/function* declarations named navigator
          if (prev23 && prev23.kind === "keyword" && prev23.text === "fn") continue;
          if (prev23 && prev23.kind === "ident" && prev23.text === "function") continue;
          if (isFunctionStarDecl(tokens, prevIdx23)) continue;

          // Must be followed by `.` or `?.`
          let nextIdx23 = nextSignificant(tokens, i + 1);
          let next23 = tokens[nextIdx23];
          // Paren-receiver bypass: `(navigator).userAgent` — resolve through paren group.
          const parenDotIdx23 = resolveParenGroupedMemberReceiverIdx(tokens, i);
          if (parenDotIdx23 !== null) { nextIdx23 = parenDotIdx23; next23 = tokens[nextIdx23]; }
          const isDot23 = next23 && next23.kind === "punct" && next23.text === ".";
          const isOptChain23 = next23 && next23.kind === "questionDot";
          if (!isDot23 && !isOptChain23) continue;

          // Member must be in the high-concern navigator capability set
          const memberIdx23 = nextSignificant(tokens, nextIdx23 + 1);
          const memberTok23 = tokens[memberIdx23];
          if (!memberTok23 || memberTok23.kind !== "ident") continue;
          if (!SYN023_NAVIGATOR_MEMBERS.has(memberTok23.text)) continue;

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const sep23 = isOptChain23 ? "?." : ".";
          const memberName23 = memberTok23.text;
          const loc23 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN023",
            severity: "warning",
            file: null,
            line: loc23.line,
            column: loc23.column,
            start: tok.start,
            end: memberTok23.end,
            message:
              `fn '${decl.name}' accesses navigator${sep23}${memberName23} — ` +
              `navigator.${memberName23} reads ambient browser capability state invisible to the capability model; ` +
              `no uses {} / reads {} / writes {} declaration covers navigator; ` +
              `pass the required value as a parameter so callers can see the dependency and tests can inject a mock, ` +
              `or wrap in unsafe "accesses navigator.${memberName23} for <reason>" { navigator${sep23}${memberName23} }`,
            rule: syn023.rule,
            idiom: syn023.idiom,
            rewrite: syn023.rewrite,
          });
          break;
        }

        // ── SYN024: document.cookie / SYN029: document.write / document.writeln ──
        case "document": {
          // Exclude: `obj.document.*` — document preceded by `.` or `?.`
          const prevIdx24 = prevSignificant(tokens, i - 1);
          const prev24 = tokens[prevIdx24];
          if (prev24 && ((prev24.kind === "punct" && prev24.text === ".") || prev24.kind === "questionDot"))
            continue;

          // Exclude: fn/function/function* declarations named document
          if (prev24 && prev24.kind === "keyword" && prev24.text === "fn") continue;
          if (prev24 && prev24.kind === "ident" && prev24.text === "function") continue;
          if (isFunctionStarDecl(tokens, prevIdx24)) continue;

          // Must be followed by `.` or `?.`
          let nextIdx24 = nextSignificant(tokens, i + 1);
          let next24 = tokens[nextIdx24];
          // Paren-receiver bypass: `(document).cookie` / `(document).write()` — resolve through paren group.
          const parenDotIdx24 = resolveParenGroupedMemberReceiverIdx(tokens, i);
          if (parenDotIdx24 !== null) { nextIdx24 = parenDotIdx24; next24 = tokens[nextIdx24]; }
          const isDot24 = next24 && next24.kind === "punct" && next24.text === ".";
          const isOptChain24 = next24 && next24.kind === "questionDot";
          if (!isDot24 && !isOptChain24) continue;

          // Read the member name
          const memberIdx24 = nextSignificant(tokens, nextIdx24 + 1);
          const memberTok24 = tokens[memberIdx24];
          if (!memberTok24 || memberTok24.kind !== "ident") continue;

          const sep24 = isOptChain24 ? "?." : ".";

          // ── SYN024: .cookie ──────────────────────────────────────────────────
          if (memberTok24.text === "cookie") {
            if (isInsideRange(tok.start, unsafeRanges)) continue;

            const loc24 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN024",
              severity: "warning",
              file: null,
              line: loc24.line,
              column: loc24.column,
              start: tok.start,
              end: memberTok24.end,
              message:
                `fn '${decl.name}' accesses document${sep24}cookie — ` +
                `document.cookie is persistent storage that is also transmitted with every matching HTTP request, ` +
                `invisible to the capability model; no reads {} / writes {} label covers it; ` +
                `pass cookies as a parameter or wrap in unsafe "accesses document.cookie for <reason>" { document${sep24}cookie }`,
              rule: syn024.rule,
              idiom: syn024.idiom,
              rewrite: syn024.rewrite,
            });
            break;
          }

          // ── SYN029: .write() / .writeln() ────────────────────────────────────
          if (memberTok24.text === "write" || memberTok24.text === "writeln") {
            // Must be followed by `(` or `?.(` — confirming this is a call, not a reference
            let afterMemberIdx29 = nextSignificant(tokens, memberIdx24 + 1);
            let afterMember29 = tokens[afterMemberIdx29];
            let isOpt29 = false;
            if (afterMember29 && afterMember29.kind === "questionDot") {
              isOpt29 = true;
              afterMemberIdx29 = nextSignificant(tokens, afterMemberIdx29 + 1);
              afterMember29 = tokens[afterMemberIdx29];
            }
            if (!afterMember29 || !(afterMember29.kind === "open" && afterMember29.text === "(")) continue;

            // Exclude TS method signatures: { write(html: string): void; }
            if (afterMember29.matchedAt !== undefined) {
              const afterCloseIdx29 = nextSignificant(tokens, afterMember29.matchedAt + 1);
              const afterClose29 = tokens[afterCloseIdx29];
              if (afterClose29 && (afterClose29.kind === "punct" && afterClose29.text === ":")) continue;
            }

            if (isInsideRange(tok.start, unsafeRanges)) continue;

            const methodStr29 = `${sep24}${memberTok24.text}${isOpt29 ? "?." : ""}`;
            const loc29 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN029",
              severity: "warning",
              file: null,
              line: loc29.line,
              column: loc29.column,
              start: tok.start,
              end: afterMember29.start + 1,
              message:
                `fn '${decl.name}' calls document${methodStr29}() — ` +
                `document.write / document.writeln inject raw HTML into the document parse stream ` +
                `and are invisible to botscript's capability model; ` +
                `after page load they clear the entire document before writing; ` +
                `use explicit DOM construction instead, or wrap in unsafe "writes to document for <reason>" { document.${memberTok24.text}(html) }`,
              rule: syn029.rule,
              idiom: syn029.idiom,
              rewrite: syn029.rewrite,
            });
            break;
          }

          continue; // not a member we care about
        }

        // ── SYN025/SYN026: requestAnimationFrame / requestIdleCallback ──────────
        case "requestAnimationFrame":
        case "requestIdleCallback": {
          const isRAF = tok.text === "requestAnimationFrame";
          const synRaf = isRAF ? syn025 : syn026;

          // Exclude property accesses: obj.requestAnimationFrame(...)
          const prevIdxRaf = prevSignificant(tokens, i - 1);
          const prevRaf = tokens[prevIdxRaf];
          if (prevRaf && ((prevRaf.kind === "punct" && prevRaf.text === ".") || prevRaf.kind === "questionDot"))
            continue;

          // Exclude function/fn/function* declarations
          if (prevRaf && prevRaf.kind === "ident" && prevRaf.text === "function") continue;
          if (prevRaf && prevRaf.kind === "keyword" && prevRaf.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdxRaf)) continue;

          // Must be followed by `(` or `?.(`
          let afterIdxRaf = nextSignificant(tokens, i + 1);
          let afterTokRaf = tokens[afterIdxRaf];
          if (afterTokRaf && afterTokRaf.kind === "questionDot") {
            afterIdxRaf = nextSignificant(tokens, afterIdxRaf + 1);
            afterTokRaf = tokens[afterIdxRaf];
          }
          if (!afterTokRaf || !(afterTokRaf.kind === "open" && afterTokRaf.text === "(")) {
            const parenIdxRaf = resolveParenGroupedCallIdx(tokens, i);
            if (parenIdxRaf === null) continue;
            afterIdxRaf = parenIdxRaf;
            afterTokRaf = tokens[afterIdxRaf]!;
          }

          // Exclude method shorthands and class methods
          const closeParenIdxRaf = afterTokRaf.matchedAt;
          if (closeParenIdxRaf !== undefined) {
            const afterParenRaf = tokens[nextSignificant(tokens, closeParenIdxRaf + 1)];
            if (
              afterParenRaf &&
              ((afterParenRaf.kind === "open" && afterParenRaf.text === "{") ||
                (afterParenRaf.kind === "punct" && afterParenRaf.text === ":"))
            ) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const locRaf = locationOf(src, tok.start);
          warnings.push({
            code: isRAF ? "SYN025" : "SYN026",
            severity: "warning",
            file: null,
            line: locRaf.line,
            column: locRaf.column,
            start: tok.start,
            end: tok.end,
            message:
              `fn '${decl.name}' calls ${tok.text}() — ` +
              `${tok.text} schedules a callback that runs after the fn returns (${isRAF ? "before the next repaint" : "during a browser idle period"}); ` +
              `any effects inside that callback are invisible to callers and cannot be declared in the fn header; ` +
              `wrap in unsafe "${isRAF ? "schedules animation frame callback" : "schedules idle callback"}" { ${tok.text}(cb) }`,
            rule: synRaf.rule,
            idiom: synRaf.idiom,
            rewrite: synRaf.rewrite,
          });
          break;
        }

        // ── SYN027: Observer constructors (MutationObserver / IntersectionObserver / ResizeObserver / PerformanceObserver)
        case "MutationObserver":
        case "IntersectionObserver":
        case "ResizeObserver":
        case "PerformanceObserver": {
          // Exclude: `obj.MutationObserver(...)` — preceded by `.` or `?.`
          const prevIdx27 = prevSignificant(tokens, i - 1);
          const prev27 = tokens[prevIdx27];
          if (prev27 && ((prev27.kind === "punct" && prev27.text === ".") || prev27.kind === "questionDot"))
            continue;

          // Exclude: function/fn/function* declarations named one of the observer constructors
          if (prev27 && prev27.kind === "ident" && prev27.text === "function") continue;
          if (prev27 && prev27.kind === "keyword" && prev27.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx27)) continue;

          const hasNew27 = prev27 && prev27.kind === "ident" && prev27.text === "new";

          const nextIdx27 = nextSignificant(tokens, i + 1);
          const next27 = tokens[nextIdx27];

          let isOpt27 = false;
          let callIdx27 = nextIdx27;

          if (next27 && next27.kind === "questionDot") {
            // Observer?.( — optional call
            isOpt27 = true;
            callIdx27 = nextSignificant(tokens, nextIdx27 + 1);
          } else if (hasNew27 && next27 && next27.kind === "operator" && next27.text === "<") {
            // new MutationObserver<T>( — generic scan only when `new` precedes
            let depth = 1;
            let j = nextIdx27 + 1;
            while (j < tokens.length && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth = Math.max(0, depth - t.text.length);
              j++;
            }
            callIdx27 = nextSignificant(tokens, j);
          }

          let callTok27 = tokens[callIdx27];
          if (!callTok27 || !(callTok27.kind === "open" && callTok27.text === "(")) {
            const parenIdx27 = resolveParenGroupedCallIdx(tokens, i);
            if (parenIdx27 === null) continue;
            callIdx27 = parenIdx27;
            callTok27 = tokens[callIdx27]!;
          }

          // Exclude method shorthands and TS method signatures: { MutationObserver(cb) { } } / { MutationObserver(cb): T; }
          if (callTok27.matchedAt !== undefined) {
            const afterCloseIdx27 = nextSignificant(tokens, callTok27.matchedAt + 1);
            const afterClose27 = tokens[afterCloseIdx27];
            if (afterClose27 && (
              (afterClose27.kind === "open" && afterClose27.text === "{") ||
              afterClose27.kind === "fatArrow" ||
              (afterClose27.kind === "punct" && afterClose27.text === ":")
            )) continue;
            // Also exclude TS method signatures with type annotations inside parens
            let hasTypeAnnotation27 = false;
            let depth27 = 0;
            let ternaryDepth27 = 0;
            for (let k27 = callIdx27 + 1; k27 < callTok27.matchedAt; k27++) {
              const at27 = tokens[k27];
              if (!at27) continue;
              if (at27.kind === "open") { depth27++; continue; }
              if (at27.kind === "close") { depth27--; continue; }
              if (depth27 !== 0) continue;
              if (at27.kind === "question") {
                const nextAfterQ27 = nextSignificant(tokens, k27 + 1);
                const nextTokQ27 = tokens[nextAfterQ27];
                if (nextTokQ27 && nextTokQ27.kind === "punct" && nextTokQ27.text === ":") {
                  hasTypeAnnotation27 = true;
                  break;
                }
                ternaryDepth27++;
                continue;
              }
              if (at27.kind === "punct" && at27.text === ":") {
                if (ternaryDepth27 > 0) { ternaryDepth27--; continue; }
                hasTypeAnnotation27 = true;
                break;
              }
            }
            if (hasTypeAnnotation27) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const obsName27 = tok.text;
          const warnStart27 = hasNew27 ? prev27!.start : tok.start;
          const loc27 = locationOf(src, warnStart27);
          warnings.push({
            code: "SYN027",
            severity: "warning",
            file: null,
            line: loc27.line,
            column: loc27.column,
            start: warnStart27,
            end: callTok27.start + 1,
            message:
              `fn '${decl.name}' ${hasNew27 ? "constructs new " : "calls "}${obsName27}${isOpt27 ? "?." : ""}() — ` +
              `${obsName27} registers a callback that fires after the fn returns when the browser observes a condition; ` +
              `any effects inside that callback are invisible to callers and cannot be declared in the fn header; ` +
              `wrap in unsafe "observes <target> for <reason>" { ${hasNew27 ? "new " : ""}${obsName27}${isOpt27 ? "?." : ""}(cb) }`,
            rule: syn027.rule,
            idiom: syn027.idiom,
            rewrite: syn027.rewrite,
          });
          break;
        }

        // ── SYN028: new Proxy() / Proxy() ────────────────────────────────────
        case "Proxy": {
          // Exclude: `obj.Proxy(...)` — preceded by `.` or `?.`
          const prevIdx28 = prevSignificant(tokens, i - 1);
          const prev28 = tokens[prevIdx28];
          if (prev28 && ((prev28.kind === "punct" && prev28.text === ".") || prev28.kind === "questionDot"))
            continue;

          // Exclude: function/fn/function* declarations named Proxy
          if (prev28 && prev28.kind === "ident" && prev28.text === "function") continue;
          if (prev28 && prev28.kind === "keyword" && prev28.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx28)) continue;

          const hasNew28 = prev28 && prev28.kind === "ident" && prev28.text === "new";

          const nextIdx28 = nextSignificant(tokens, i + 1);
          const next28 = tokens[nextIdx28];

          let isOpt28 = false;
          let callIdx28 = nextIdx28;

          if (next28 && next28.kind === "questionDot") {
            isOpt28 = true;
            callIdx28 = nextSignificant(tokens, nextIdx28 + 1);
          } else if (hasNew28 && next28 && next28.kind === "operator" && next28.text === "<") {
            // new Proxy<T>( — generic scan only when `new` precedes
            let depth = 1;
            let j = nextIdx28 + 1;
            while (j < tokens.length && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth = Math.max(0, depth - t.text.length);
              j++;
            }
            callIdx28 = nextSignificant(tokens, j);
          }

          let callTok28 = tokens[callIdx28];
          if (!callTok28 || !(callTok28.kind === "open" && callTok28.text === "(")) {
            const parenIdx28 = resolveParenGroupedCallIdx(tokens, i);
            if (parenIdx28 === null) continue;
            callIdx28 = parenIdx28;
            callTok28 = tokens[callIdx28]!;
          }

          // Exclude method shorthands and TS method signatures: { Proxy(t, h) { } } / { Proxy(t, h): T; }
          if (callTok28.matchedAt !== undefined) {
            const afterCloseIdx28 = nextSignificant(tokens, callTok28.matchedAt + 1);
            const afterClose28 = tokens[afterCloseIdx28];
            if (afterClose28 && (
              (afterClose28.kind === "open" && afterClose28.text === "{") ||
              afterClose28.kind === "fatArrow" ||
              (afterClose28.kind === "punct" && afterClose28.text === ":")
            )) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const warnStart28 = hasNew28 ? prev28!.start : tok.start;
          const loc28 = locationOf(src, warnStart28);
          warnings.push({
            code: "SYN028",
            severity: "warning",
            file: null,
            line: loc28.line,
            column: loc28.column,
            start: warnStart28,
            end: callTok28.start + 1,
            message:
              `fn '${decl.name}' ${hasNew28 ? "constructs new " : "calls "}Proxy${isOpt28 ? "?." : ""}() — ` +
              `Proxy wraps an object with handler traps that intercept all property access; ` +
              `if the target or handler closes over capability-bearing objects, those capabilities ` +
              `are laundered through the Proxy and become invisible to the fn's declared surface; ` +
              `wrap in unsafe "proxies <target> for <reason>" { ${hasNew28 ? "new " : ""}Proxy${isOpt28 ? "?." : ""}(target, handler) }`,
            rule: syn028.rule,
            idiom: syn028.idiom,
            rewrite: syn028.rewrite,
          });
          break;
        }

        // ── SYN030: new FinalizationRegistry(callback) ───────────────────────
        case "FinalizationRegistry": {
          // Exclude: `obj.FinalizationRegistry(...)` — preceded by `.` or `?.`
          const prevIdx30 = prevSignificant(tokens, i - 1);
          const prev30 = tokens[prevIdx30];
          if (prev30 && ((prev30.kind === "punct" && prev30.text === ".") || prev30.kind === "questionDot"))
            continue;

          // Exclude: function/fn/function* declarations named FinalizationRegistry
          if (prev30 && prev30.kind === "ident" && prev30.text === "function") continue;
          if (prev30 && prev30.kind === "keyword" && prev30.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx30)) continue;

          const hasNew30 = prev30 && prev30.kind === "ident" && prev30.text === "new";

          const nextIdx30 = nextSignificant(tokens, i + 1);
          const next30 = tokens[nextIdx30];

          let isOpt30 = false;
          let callIdx30 = nextIdx30;

          if (next30 && next30.kind === "questionDot") {
            isOpt30 = true;
            callIdx30 = nextSignificant(tokens, nextIdx30 + 1);
          } else if (hasNew30 && next30 && next30.kind === "operator" && next30.text === "<") {
            // new FinalizationRegistry<T>( — generic scan only when `new` precedes
            let depth = 1;
            let j = nextIdx30 + 1;
            while (j < tokens.length && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth = Math.max(0, depth - t.text.length);
              j++;
            }
            callIdx30 = nextSignificant(tokens, j);
          }

          let callTok30 = tokens[callIdx30];
          if (!callTok30 || !(callTok30.kind === "open" && callTok30.text === "(")) {
            const parenIdx30 = resolveParenGroupedCallIdx(tokens, i);
            if (parenIdx30 === null) continue;
            callIdx30 = parenIdx30;
            callTok30 = tokens[callIdx30]!;
          }

          // Exclude method shorthands and TS method signatures: { FinalizationRegistry(cb) { } } / { FinalizationRegistry(cb): T; }
          if (callTok30.matchedAt !== undefined) {
            const afterCloseIdx30 = nextSignificant(tokens, callTok30.matchedAt + 1);
            const afterClose30 = tokens[afterCloseIdx30];
            if (afterClose30 && (
              (afterClose30.kind === "open" && afterClose30.text === "{") ||
              afterClose30.kind === "fatArrow" ||
              (afterClose30.kind === "punct" && afterClose30.text === ":")
            )) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const warnStart30 = hasNew30 ? prev30!.start : tok.start;
          const loc30 = locationOf(src, warnStart30);
          warnings.push({
            code: "SYN030",
            severity: "warning",
            file: null,
            line: loc30.line,
            column: loc30.column,
            start: warnStart30,
            end: callTok30.start + 1,
            message:
              `fn '${decl.name}' ${hasNew30 ? "constructs new " : "calls "}FinalizationRegistry${isOpt30 ? "?." : ""}() — ` +
              `FinalizationRegistry registers a cleanup callback that fires when a target is garbage-collected; ` +
              `GC timing is non-deterministic and implementation-specific — any effects inside the callback ` +
              `are invisible to callers and cannot be declared in the fn header; ` +
              `wrap in unsafe "registers GC callback for <reason>" { ${hasNew30 ? "new " : ""}FinalizationRegistry${isOpt30 ? "?." : ""}(cb) }`,
            rule: syn030.rule,
            idiom: syn030.idiom,
            rewrite: syn030.rewrite,
          });
          break;
        }

        // ── SYN031: new MessageChannel() ─────────────────────────────────────
        case "MessageChannel": {
          // Exclude: `obj.MessageChannel(...)` — preceded by `.` or `?.`
          const prevIdx31 = prevSignificant(tokens, i - 1);
          const prev31 = tokens[prevIdx31];
          if (prev31 && ((prev31.kind === "punct" && prev31.text === ".") || prev31.kind === "questionDot"))
            continue;

          // Exclude: function/fn/function* declarations named MessageChannel
          if (prev31 && prev31.kind === "ident" && prev31.text === "function") continue;
          if (prev31 && prev31.kind === "keyword" && prev31.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx31)) continue;

          const hasNew31 = prev31 && prev31.kind === "ident" && prev31.text === "new";

          const nextIdx31 = nextSignificant(tokens, i + 1);
          const next31 = tokens[nextIdx31];

          let isOpt31 = false;
          let callIdx31 = nextIdx31;

          if (next31 && next31.kind === "questionDot") {
            isOpt31 = true;
            callIdx31 = nextSignificant(tokens, nextIdx31 + 1);
          } else if (hasNew31 && next31 && next31.kind === "operator" && next31.text === "<") {
            // new MessageChannel<T>( — generic scan only when `new` precedes
            let depth = 1;
            let j = nextIdx31 + 1;
            while (j < tokens.length && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth = Math.max(0, depth - t.text.length);
              j++;
            }
            callIdx31 = nextSignificant(tokens, j);
          }

          let callTok31 = tokens[callIdx31];
          if (!callTok31 || !(callTok31.kind === "open" && callTok31.text === "(")) {
            const parenIdx31 = resolveParenGroupedCallIdx(tokens, i);
            if (parenIdx31 === null) continue;
            callIdx31 = parenIdx31;
            callTok31 = tokens[callIdx31]!;
          }

          // Exclude method shorthands and TS method signatures: { MessageChannel() { } } / { MessageChannel(): T; }
          if (callTok31.matchedAt !== undefined) {
            const afterCloseIdx31 = nextSignificant(tokens, callTok31.matchedAt + 1);
            const afterClose31 = tokens[afterCloseIdx31];
            if (afterClose31 && (
              (afterClose31.kind === "open" && afterClose31.text === "{") ||
              afterClose31.kind === "fatArrow" ||
              (afterClose31.kind === "punct" && afterClose31.text === ":")
            )) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const warnStart31 = hasNew31 ? prev31!.start : tok.start;
          const loc31 = locationOf(src, warnStart31);
          warnings.push({
            code: "SYN031",
            severity: "warning",
            file: null,
            line: loc31.line,
            column: loc31.column,
            start: warnStart31,
            end: callTok31.start + 1,
            message:
              `fn '${decl.name}' ${hasNew31 ? "constructs new " : "calls "}MessageChannel${isOpt31 ? "?." : ""}() — ` +
              `MessageChannel creates two paired MessagePort objects; messages sent via port.postMessage() ` +
              `are delivered asynchronously to the other port's .onmessage handler after the fn returns — ` +
              `any handler effects are invisible to callers and cannot be declared in the fn header; ` +
              `wrap in unsafe "creates message channel for <reason>" { ${hasNew31 ? "new " : ""}MessageChannel${isOpt31 ? "?." : ""}() }`,
            rule: syn031.rule,
            idiom: syn031.idiom,
            rewrite: syn031.rewrite,
          });
          break;
        }

        // ── SYN032: new RTCPeerConnection() ──────────────────────────────────
        case "RTCPeerConnection": {
          // Exclude: `obj.RTCPeerConnection(...)` — preceded by `.` or `?.`
          const prevIdx32 = prevSignificant(tokens, i - 1);
          const prev32 = tokens[prevIdx32];
          if (prev32 && ((prev32.kind === "punct" && prev32.text === ".") || prev32.kind === "questionDot"))
            continue;

          // Exclude: function/fn/function* declarations named RTCPeerConnection
          if (prev32 && prev32.kind === "ident" && prev32.text === "function") continue;
          if (prev32 && prev32.kind === "keyword" && prev32.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx32)) continue;

          const hasNew32 = prev32 && prev32.kind === "ident" && prev32.text === "new";

          const nextIdx32 = nextSignificant(tokens, i + 1);
          const next32 = tokens[nextIdx32];

          let isOpt32 = false;
          let callIdx32 = nextIdx32;

          if (next32 && next32.kind === "questionDot") {
            isOpt32 = true;
            callIdx32 = nextSignificant(tokens, nextIdx32 + 1);
          } else if (hasNew32 && next32 && next32.kind === "operator" && next32.text === "<") {
            // new RTCPeerConnection<T>( — generic scan only when `new` precedes
            let depth = 1;
            let j = nextIdx32 + 1;
            while (j < tokens.length && depth > 0) {
              const t = tokens[j];
              if (!t) break;
              if (t.kind === "operator" && t.text === "<") depth++;
              else if (t.kind === "operator" && (t.text === ">" || t.text === ">>" || t.text === ">>>"))
                depth = Math.max(0, depth - t.text.length);
              j++;
            }
            callIdx32 = nextSignificant(tokens, j);
          }

          let callTok32 = tokens[callIdx32];
          if (!callTok32 || !(callTok32.kind === "open" && callTok32.text === "(")) {
            const parenIdx32 = resolveParenGroupedCallIdx(tokens, i);
            if (parenIdx32 === null) continue;
            callIdx32 = parenIdx32;
            callTok32 = tokens[callIdx32]!;
          }

          // Exclude method shorthands and TS method signatures: { RTCPeerConnection() { } } / { RTCPeerConnection(): T; }
          if (callTok32.matchedAt !== undefined) {
            const afterCloseIdx32 = nextSignificant(tokens, callTok32.matchedAt + 1);
            const afterClose32 = tokens[afterCloseIdx32];
            if (afterClose32 && (
              (afterClose32.kind === "open" && afterClose32.text === "{") ||
              afterClose32.kind === "fatArrow" ||
              (afterClose32.kind === "punct" && afterClose32.text === ":")
            )) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const warnStart32 = hasNew32 ? prev32!.start : tok.start;
          const loc32 = locationOf(src, warnStart32);
          warnings.push({
            code: "SYN032",
            severity: "warning",
            file: null,
            line: loc32.line,
            column: loc32.column,
            start: warnStart32,
            end: callTok32.start + 1,
            message:
              `fn '${decl.name}' ${hasNew32 ? "constructs new " : "calls "}RTCPeerConnection${isOpt32 ? "?." : ""}() — ` +
              `RTCPeerConnection opens a WebRTC peer-to-peer session; once ICE completes the connection can ` +
              `exchange data via RTCDataChannel or stream media over UDP — invisible to CAP001, which only ` +
              `checks http.* member calls; handler effects (onicecandidate, ondatachannel) fire asynchronously ` +
              `after the fn returns and cannot be declared in fn headers; ` +
              `wrap in unsafe "opens WebRTC peer connection for <reason>" { ${hasNew32 ? "new " : ""}RTCPeerConnection${isOpt32 ? "?." : ""}(config) }`,
            rule: syn032.rule,
            idiom: syn032.idiom,
            rewrite: syn032.rewrite,
          });
          break;
        }

        // ── SYN034: location.* — global location access (navigation I/O + env dep) ──
        case "location": {
          // Exclude: `obj.location.*` — location preceded by `.` or `?.`
          const prevIdx34 = prevSignificant(tokens, i - 1);
          const prev34 = tokens[prevIdx34];
          if (prev34 && ((prev34.kind === "punct" && prev34.text === ".") || prev34.kind === "questionDot"))
            continue;

          // Exclude: fn/function/function* declarations named location
          if (prev34 && prev34.kind === "keyword" && prev34.text === "fn") continue;
          if (prev34 && prev34.kind === "ident" && prev34.text === "function") continue;
          if (isFunctionStarDecl(tokens, prevIdx34)) continue;

          // Must be followed by `.` or `?.`
          let nextIdx34 = nextSignificant(tokens, i + 1);
          let next34 = tokens[nextIdx34];
          // Paren-receiver bypass: `(location).href` — resolve through paren group.
          const parenDotIdx34 = resolveParenGroupedMemberReceiverIdx(tokens, i);
          if (parenDotIdx34 !== null) { nextIdx34 = parenDotIdx34; next34 = tokens[nextIdx34]; }
          const isDot34 = next34 && next34.kind === "punct" && next34.text === ".";
          const isOptChain34 = next34 && next34.kind === "questionDot";
          if (!isDot34 && !isOptChain34) continue;

          // Member must be in the high-concern location set
          const memberIdx34 = nextSignificant(tokens, nextIdx34 + 1);
          const memberTok34 = tokens[memberIdx34];
          if (!memberTok34 || memberTok34.kind !== "ident") continue;
          if (!SYN034_LOCATION_MEMBERS.has(memberTok34.text)) continue;

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const sep34 = isOptChain34 ? "?." : ".";
          const memberName34 = memberTok34.text;
          const isNavCall34 = LOCATION_NAV_METHODS.has(memberName34);
          const loc34 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN034",
            severity: "warning",
            file: null,
            line: loc34.line,
            column: loc34.column,
            start: tok.start,
            end: memberTok34.end,
            message:
              `fn '${decl.name}' accesses location${sep34}${memberName34} — ` +
              (isNavCall34
                ? `location.${memberName34}() is a navigation side effect that redirects or reloads the page; `
                : `location.${memberName34} reads the ambient URL, which differs between deployment environments; `) +
              `no uses {} / reads {} / writes {} declaration covers the location global; ` +
              `pass the required value as a parameter so callers can see the dependency and tests can inject a mock, ` +
              `or wrap in unsafe "accesses location.${memberName34} for <reason>" { location${sep34}${memberName34} }`,
            rule: syn034.rule,
            idiom: syn034.idiom,
            rewrite: syn034.rewrite,
          });
          break;
        }

        // ── SYN035: history.* — browser history mutation + ambient navigation state ──
        case "history": {
          // Exclude: `obj.history.*` — history preceded by `.` or `?.`
          const prevIdx35 = prevSignificant(tokens, i - 1);
          const prev35 = tokens[prevIdx35];
          if (prev35 && ((prev35.kind === "punct" && prev35.text === ".") || prev35.kind === "questionDot"))
            continue;

          // Exclude: fn/function/function* declarations named history
          if (prev35 && prev35.kind === "keyword" && prev35.text === "fn") continue;
          if (prev35 && prev35.kind === "ident" && prev35.text === "function") continue;
          if (isFunctionStarDecl(tokens, prevIdx35)) continue;

          // Must be followed by `.` or `?.`
          let nextIdx35 = nextSignificant(tokens, i + 1);
          let next35 = tokens[nextIdx35];
          // Paren-receiver bypass: `(history).pushState()` — resolve through paren group.
          const parenDotIdx35 = resolveParenGroupedMemberReceiverIdx(tokens, i);
          if (parenDotIdx35 !== null) { nextIdx35 = parenDotIdx35; next35 = tokens[nextIdx35]; }
          const isDot35 = next35 && next35.kind === "punct" && next35.text === ".";
          const isOptChain35 = next35 && next35.kind === "questionDot";
          if (!isDot35 && !isOptChain35) continue;

          // Member must be in the high-concern history set
          const memberIdx35 = nextSignificant(tokens, nextIdx35 + 1);
          const memberTok35 = tokens[memberIdx35];
          if (!memberTok35 || memberTok35.kind !== "ident") continue;
          if (!SYN035_HISTORY_MEMBERS.has(memberTok35.text)) continue;

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const sep35 = isOptChain35 ? "?." : ".";
          const memberName35 = memberTok35.text;
          const isNavMutation35 = HISTORY_NAV_METHODS.has(memberName35);
          const loc35 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN035",
            severity: "warning",
            file: null,
            line: loc35.line,
            column: loc35.column,
            start: tok.start,
            end: memberTok35.end,
            message:
              `fn '${decl.name}' accesses history${sep35}${memberName35} — ` +
              (isNavMutation35
                ? `history.${memberName35}() mutates the browser history stack or triggers navigation; ` +
                  `the side effect outlives the fn call and cannot be declared in any fn header; ` +
                  `accept a push/navigate callback as a parameter so callers control navigation, ` +
                  `or wrap in unsafe "pushes history for <reason>" { history${sep35}${memberName35}(...) }`
                : `history.${memberName35} reads ambient navigation state that varies by session; ` +
                  `no uses {} / reads {} / writes {} declaration covers the history global; ` +
                  `pass the required value as a parameter so callers can inject a fixed value in tests, ` +
                  `or wrap in unsafe "reads history.${memberName35} for <reason>" { history${sep35}${memberName35} }`),
            rule: syn035.rule,
            idiom: syn035.idiom,
            rewrite: syn035.rewrite,
          });
          break;
        }

        // ── SYN036: WebAssembly.instantiate / compile — opaque binary execution ─
        case "WebAssembly": {
          // Exclude: `obj.WebAssembly` — preceded by `.` or `?.`
          const prevIdx36 = prevSignificant(tokens, i - 1);
          const prev36 = tokens[prevIdx36];
          if (prev36 && ((prev36.kind === "punct" && prev36.text === ".") || prev36.kind === "questionDot"))
            continue;

          // Exclude: function/fn/function* declarations named WebAssembly
          if (prev36 && prev36.kind === "ident" && prev36.text === "function") continue;
          if (prev36 && prev36.kind === "keyword" && prev36.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx36)) continue;

          // Must be followed by `.` or `?.` (member access on the WebAssembly namespace)
          let nextIdx36 = nextSignificant(tokens, i + 1);
          let next36 = tokens[nextIdx36];
          // Paren-receiver bypass: `(WebAssembly).instantiate()` — resolve through paren group.
          const parenDotIdx36 = resolveParenGroupedMemberReceiverIdx(tokens, i);
          if (parenDotIdx36 !== null) { nextIdx36 = parenDotIdx36; next36 = tokens[nextIdx36]; }
          const isDot36 = next36 && next36.kind === "punct" && next36.text === ".";
          const isOptChain36 = next36 && next36.kind === "questionDot";
          if (!isDot36 && !isOptChain36) continue;

          // Check the member name — only fire for execution/compilation members
          const memberIdx36 = nextSignificant(tokens, nextIdx36 + 1);
          const memberTok36 = tokens[memberIdx36];
          if (!memberTok36 || memberTok36.kind !== "ident") continue;
          if (!SYN036_WASM_MEMBERS.has(memberTok36.text)) continue;

          // Must be a call: member must be followed by `(` or `?.(` (call confirmation)
          let afterMemberIdx36 = nextSignificant(tokens, memberIdx36 + 1);
          let afterMember36 = tokens[afterMemberIdx36];
          let isOptCall36 = false;
          if (afterMember36 && afterMember36.kind === "questionDot") {
            isOptCall36 = true;
            afterMemberIdx36 = nextSignificant(tokens, afterMemberIdx36 + 1);
            afterMember36 = tokens[afterMemberIdx36];
          }
          if (!afterMember36 || !(afterMember36.kind === "open" && afterMember36.text === "(")) continue;

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const hasNew36 = prev36 && prev36.kind === "ident" && prev36.text === "new";
          const warnStart36 = hasNew36 ? prev36!.start : tok.start;
          const loc36 = locationOf(src, warnStart36);
          const sep36 = isOptChain36 ? "?." : ".";
          const callSep36 = isOptCall36 ? "?." : "";
          const newPrefix36 = hasNew36 ? "new " : "";
          warnings.push({
            code: "SYN036",
            severity: "warning",
            file: null,
            line: loc36.line,
            column: loc36.column,
            start: warnStart36,
            end: memberTok36.end,
            message:
              `fn '${decl.name}' calls ${newPrefix36}WebAssembly${sep36}${memberTok36.text}${callSep36}() — ` +
              `WebAssembly execution is opaque to the capability model: the compiled module can make network ` +
              `requests, access memory, and produce any side effect without a uses {} or writes {} declaration; ` +
              `accept a pre-compiled WebAssembly.Instance parameter instead, or wrap in ` +
              `unsafe "executes <module> WASM for <reason>" { ${newPrefix36}WebAssembly${sep36}${memberTok36.text}${callSep36}(...) }`,
            rule: syn036.rule,
            idiom: syn036.idiom,
            rewrite: syn036.rewrite,
          });
          break;
        }

        // ── SYN037: <SYN-guarded-global>.call() / .apply() / .bind() ─────────
        case "call":
        case "apply":
        case "bind": {
          // Must be preceded by `.` or `?.` — confirming this is a method access.
          const prevIdx37 = prevSignificant(tokens, i - 1);
          const prev37 = tokens[prevIdx37];
          if (!prev37 || !((prev37.kind === "punct" && prev37.text === ".") || prev37.kind === "questionDot"))
            continue;

          // Look back to the receiver — must be a SYN-guarded global name.
          const receiverIdx37 = prevSignificant(tokens, prevIdx37 - 1);
          const receiver37 = tokens[receiverIdx37];
          if (!receiver37 || receiver37.kind !== "ident") continue;
          if (!SYN037_GUARDED_GLOBALS.has(receiver37.text)) continue;

          // Receiver must not itself be a member access: `obj.fetch.call(...)` — not a bare global.
          const beforeReceiverIdx37 = prevSignificant(tokens, receiverIdx37 - 1);
          const beforeReceiver37 = tokens[beforeReceiverIdx37];
          if (beforeReceiver37 && ((beforeReceiver37.kind === "punct" && beforeReceiver37.text === ".") || beforeReceiver37.kind === "questionDot"))
            continue;

          // Exclude: fn/function/function* declarations named call/apply/bind
          if (prev37.kind !== "questionDot") {
            if (beforeReceiver37 && beforeReceiver37.kind === "keyword" && beforeReceiver37.text === "fn") continue;
            if (beforeReceiver37 && beforeReceiver37.kind === "ident" && beforeReceiver37.text === "function") continue;
            if (isFunctionStarDecl(tokens, beforeReceiverIdx37)) continue;
          }

          // Must be followed by `(` or `?.(`
          const nextIdx37 = nextSignificant(tokens, i + 1);
          const next37 = tokens[nextIdx37];
          let callIdx37 = nextIdx37;
          let isOpt37 = false;
          if (next37 && next37.kind === "questionDot") {
            isOpt37 = true;
            callIdx37 = nextSignificant(tokens, nextIdx37 + 1);
          }
          const callTok37 = tokens[callIdx37];
          if (!callTok37 || !(callTok37.kind === "open" && callTok37.text === "(")) continue;

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const methodName37 = tok.text;
          const globalName37 = receiver37.text;
          const dot37 = prev37.kind === "questionDot" ? "?." : ".";
          const callSep37 = isOpt37 ? "?." : "";
          const loc37 = locationOf(src, receiver37.start);
          warnings.push({
            code: "SYN037",
            severity: "warning",
            file: null,
            line: loc37.line,
            column: loc37.column,
            start: receiver37.start,
            end: callTok37.start + 1,
            message:
              `fn '${decl.name}' calls ${globalName37}${dot37}${methodName37}${callSep37}() — ` +
              `${globalName37}.${methodName37} invokes ${globalName37} without using its name as the call token, ` +
              `bypassing SYN007–SYN036 name-token detection; ` +
              `call ${globalName37}(...) directly or wrap in unsafe "${globalName37}.${methodName37} for <reason>" { ${globalName37}.${methodName37}(...) }`,
            rule: syn037.rule,
            idiom: syn037.idiom,
            rewrite: syn037.rewrite,
          });
          break;
        }

        // ── SYN039 + SYN040: Object.defineProperty / Object.setPrototypeOf ──
        case "Object": {
          // Exclude: `obj.Object.*` — Object preceded by `.` or `?.`
          const prevIdxObj = prevSignificant(tokens, i - 1);
          const prevObj = tokens[prevIdxObj];
          if (prevObj && ((prevObj.kind === "punct" && prevObj.text === ".") || prevObj.kind === "questionDot"))
            continue;

          // Exclude: fn/function/function* declarations named Object
          if (prevObj && prevObj.kind === "keyword" && prevObj.text === "fn") continue;
          if (prevObj && prevObj.kind === "ident" && prevObj.text === "function") continue;
          if (isFunctionStarDecl(tokens, prevIdxObj)) continue;

          // Must be followed by `.` or `?.`
          let nextIdxObj = nextSignificant(tokens, i + 1);
          let nextObj = tokens[nextIdxObj];
          // Paren-receiver bypass: `(Object).defineProperty()` — resolve through paren group.
          const parenDotIdxObj = resolveParenGroupedMemberReceiverIdx(tokens, i);
          if (parenDotIdxObj !== null) { nextIdxObj = parenDotIdxObj; nextObj = tokens[nextIdxObj]; }
          const isDotObj = nextObj && nextObj.kind === "punct" && nextObj.text === ".";
          const isOptChainObj = nextObj && nextObj.kind === "questionDot";
          if (!isDotObj && !isOptChainObj) continue;

          // Get the method name
          const methodIdxObj = nextSignificant(tokens, nextIdxObj + 1);
          const methodObj = tokens[methodIdxObj];
          if (!methodObj || methodObj.kind !== "ident") continue;

          const sepObj = isOptChainObj ? "?." : ".";

          if (methodObj.text === "defineProperty" || methodObj.text === "defineProperties") {
            // ── SYN039 ──
            let callIdx39 = nextSignificant(tokens, methodIdxObj + 1);
            let callTok39 = tokens[callIdx39];
            let isOptCall39 = false;
            if (callTok39 && callTok39.kind === "questionDot") {
              isOptCall39 = true;
              callIdx39 = nextSignificant(tokens, callIdx39 + 1);
              callTok39 = tokens[callIdx39];
            }
            if (!callTok39 || !(callTok39.kind === "open" && callTok39.text === "(")) continue;
            if (isInsideRange(tok.start, unsafeRanges)) continue;
            const callSep39 = isOptCall39 ? "?." : "";
            const loc39 = locationOf(src, tok.start);
            warnings.push({
              code: "SYN039",
              severity: "warning",
              file: null,
              line: loc39.line,
              column: loc39.column,
              start: tok.start,
              end: callTok39.start + 1,
              message:
                `fn '${decl.name}' calls Object${sepObj}${methodObj.text}${callSep39}() — ` +
                `Object.${methodObj.text} redefines property descriptors at runtime; ` +
                `effects (hidden getters/setters, non-writable locks) are invisible to the capability model and cannot be declared in the fn header; ` +
                `avoid mutating shared or global objects; ` +
                `wrap in unsafe "redefines <target>.<key> for <reason>" { Object.${methodObj.text}(...) } if intentional`,
              rule: syn039.rule,
              idiom: syn039.idiom,
              rewrite: syn039.rewrite,
            });
          } else if (methodObj.text === "setPrototypeOf") {
            // ── SYN040 (Object.setPrototypeOf) ──
            let callIdx40 = nextSignificant(tokens, methodIdxObj + 1);
            let callTok40 = tokens[callIdx40];
            if (callTok40 && callTok40.kind === "questionDot") {
              callIdx40 = nextSignificant(tokens, callIdx40 + 1);
              callTok40 = tokens[callIdx40];
            }
            if (!callTok40 || !(callTok40.kind === "open" && callTok40.text === "(")) continue;
            if (isInsideRange(tok.start, unsafeRanges)) continue;
            const loc40a = locationOf(src, tok.start);
            warnings.push({
              code: "SYN040",
              severity: "warning",
              file: null,
              line: loc40a.line,
              column: loc40a.column,
              start: tok.start,
              end: methodObj.end,
              message:
                `fn '${decl.name}' calls Object${sepObj}setPrototypeOf() — ` +
                `Object.setPrototypeOf() replaces the prototype chain of a target at runtime, ` +
                `silently redirecting property lookups (including capability-gated globals such as fetch, WebSocket, setTimeout) ` +
                `through a new chain invisible to the static capability model; ` +
                `SYN007–SYN039 source-level checks are defeated at runtime if a prototype mutation occurs first; ` +
                `model shape changes as explicit data structures, or wrap in unsafe "mutates prototype of <target> for <reason>" { Object${sepObj}setPrototypeOf(...) }`,
              rule: syn040.rule,
              idiom: syn040.idiom,
              rewrite: syn040.rewrite,
            });
          }
          break;
        }

        // ── SYN040: __proto__ assignment ──────────────────────────────────────
        case "__proto__": {
          // Must be preceded by `.` or `?.` — confirming this is a member access
          const prevIdx40b = prevSignificant(tokens, i - 1);
          const prev40b = tokens[prevIdx40b];
          if (!prev40b || !((prev40b.kind === "punct" && prev40b.text === ".") || prev40b.kind === "questionDot"))
            continue;

          // Must be followed by `=` (plain assignment, `eq` token — not `==`, `===`, `+=`, etc.)
          const nextIdx40b = nextSignificant(tokens, i + 1);
          const next40b = tokens[nextIdx40b];
          if (!next40b || next40b.kind !== "eq") continue;

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const loc40b = locationOf(src, tok.start);
          warnings.push({
            code: "SYN040",
            severity: "warning",
            file: null,
            line: loc40b.line,
            column: loc40b.column,
            start: tok.start,
            end: tok.end,
            message:
              `fn '${decl.name}' assigns to .__proto__ — ` +
              `.__proto__ = proto replaces the prototype chain of the target at runtime, ` +
              `silently redirecting property lookups (including capability-gated globals) ` +
              `through a new chain invisible to the static capability model; ` +
              `use Object.create() to build objects with explicit prototypes instead, ` +
              `or wrap in unsafe "mutates prototype for <reason>" { target.__proto__ = proto }`,
            rule: syn040.rule,
            idiom: syn040.idiom,
            rewrite: syn040.rewrite,
          });
          break;
        }

        // ── SYN042: Reflect.* — dynamic dispatch and property mutation bypasses ──
        case "Reflect": {
          // Exclude: `obj.Reflect.*` — Reflect preceded by `.` or `?.`
          const prevIdxRef = prevSignificant(tokens, i - 1);
          const prevRef = tokens[prevIdxRef];
          if (prevRef && ((prevRef.kind === "punct" && prevRef.text === ".") || prevRef.kind === "questionDot"))
            continue;

          // Exclude: fn/function/function* declarations named Reflect
          if (prevRef && prevRef.kind === "keyword" && prevRef.text === "fn") continue;
          if (prevRef && prevRef.kind === "ident" && prevRef.text === "function") continue;
          if (isFunctionStarDecl(tokens, prevIdxRef)) continue;

          // Must be followed by `.` or `?.`
          let nextIdxRef = nextSignificant(tokens, i + 1);
          let nextRef = tokens[nextIdxRef];
          // Paren-receiver bypass: `(Reflect).apply()` — resolve through paren group.
          const parenDotIdxRef = resolveParenGroupedMemberReceiverIdx(tokens, i);
          if (parenDotIdxRef !== null) { nextIdxRef = parenDotIdxRef; nextRef = tokens[nextIdxRef]; }
          const isDotRef = nextRef && nextRef.kind === "punct" && nextRef.text === ".";
          const isOptChainRef = nextRef && nextRef.kind === "questionDot";
          if (!isDotRef && !isOptChainRef) continue;

          // Get the method name
          const methodIdxRef = nextSignificant(tokens, nextIdxRef + 1);
          const methodRef = tokens[methodIdxRef];
          if (!methodRef || methodRef.kind !== "ident") continue;
          if (!SYN042_REFLECT_METHODS.has(methodRef.text)) continue;

          // Must be followed by `(` or `?.(`
          let callIdxRef = nextSignificant(tokens, methodIdxRef + 1);
          let callTokRef = tokens[callIdxRef];
          let isOptCallRef = false;
          if (callTokRef && callTokRef.kind === "questionDot") {
            isOptCallRef = true;
            callIdxRef = nextSignificant(tokens, callIdxRef + 1);
            callTokRef = tokens[callIdxRef];
          }
          if (!callTokRef || !(callTokRef.kind === "open" && callTokRef.text === "(")) continue;
          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const sepRef = isOptChainRef ? "?." : ".";
          const callSepRef = isOptCallRef ? "?." : "";
          const locRef = locationOf(src, tok.start);

          let bypassKind: string;
          if (methodRef.text === "apply" || methodRef.text === "construct") {
            bypassKind =
              `Reflect.${methodRef.text}() calls a function or constructor dynamically — ` +
              `SYN004–SYN041 name-based checks fire on source-level idents (eval, fetch, WebSocket…) ` +
              `and cannot see through dynamic dispatch; ` +
              `Reflect.${methodRef.text}(dangerousFn, ...) executes it at runtime with no capability warning`;
          } else if (methodRef.text === "setPrototypeOf") {
            bypassKind =
              `Reflect.setPrototypeOf() replaces the prototype chain of target at runtime, ` +
              `silently redirecting property lookups (including capability-gated globals like fetch, WebSocket) ` +
              `through a new chain invisible to the static capability model; ` +
              `equivalent to Object.setPrototypeOf() (SYN040)`;
          } else {
            bypassKind =
              `Reflect.${methodRef.text}() mutates object properties at runtime — ` +
              `invisible to the capability model and equivalent to the mutations caught by SYN039; ` +
              `use explicit property assignment or Object.assign() for traceable mutations`;
          }

          warnings.push({
            code: "SYN042",
            severity: "warning",
            file: null,
            line: locRef.line,
            column: locRef.column,
            start: tok.start,
            end: callTokRef.start + 1,
            message:
              `fn '${decl.name}' calls Reflect${sepRef}${methodRef.text}${callSepRef}() — ` +
              bypassKind + `; ` +
              `wrap in unsafe "reason for Reflect.${methodRef.text}" { Reflect.${methodRef.text}(...) } if this is intentional`,
            rule: syn042.rule,
            idiom: syn042.idiom,
            rewrite: syn042.rewrite,
          });
          break;
        }

        // ── SYN038 + SYN041: globalThis / window / self member access ────────
        case "globalThis":
        case "window":
        case "self": {
          // Shared prefix: exclude member accesses on local bindings and fn declarations
          const prevIdxGlob = prevSignificant(tokens, i - 1);
          const prevGlob = tokens[prevIdxGlob];
          if (prevGlob && ((prevGlob.kind === "punct" && prevGlob.text === ".") || prevGlob.kind === "questionDot"))
            continue;
          if (prevGlob && prevGlob.kind === "keyword" && prevGlob.text === "fn") continue;
          if (prevGlob && prevGlob.kind === "ident" && prevGlob.text === "function") continue;
          if (isFunctionStarDecl(tokens, prevIdxGlob)) continue;

          let nextIdxGlob = nextSignificant(tokens, i + 1);
          let nextGlob = tokens[nextIdxGlob];
          // Paren-receiver bypass: `(globalThis).fetch()` — resolve through paren group.
          const parenDotIdxGlob = resolveParenGroupedMemberReceiverIdx(tokens, i);
          if (parenDotIdxGlob !== null) { nextIdxGlob = parenDotIdxGlob; nextGlob = tokens[nextIdxGlob]; }
          const isDotGlob = nextGlob && nextGlob.kind === "punct" && nextGlob.text === ".";
          const isOptChainGlob = nextGlob && nextGlob.kind === "questionDot";
          const isBracketGlob = !isDotGlob && !isOptChainGlob && nextGlob && nextGlob.kind === "open" && nextGlob.text === "[";

          // ── SYN043: computed string bracket access — globalThis['fetch'] etc. ──
          if (isBracketGlob) {
            const strIdx43 = nextSignificant(tokens, nextIdxGlob + 1);
            const strTok43 = tokens[strIdx43];
            if (strTok43 && strTok43.kind === "string") {
              const raw43 = strTok43.text;
              const memberName43 = raw43.slice(1, -1);
              if (SYN041_DANGEROUS_MEMBERS.has(memberName43) && !isInsideRange(tok.start, unsafeRanges)) {
                const loc43 = locationOf(src, tok.start);
                warnings.push({
                  code: "SYN043",
                  severity: "warning",
                  file: null,
                  line: loc43.line,
                  column: loc43.column,
                  start: tok.start,
                  end: strTok43.end,
                  message:
                    `fn '${decl.name}' accesses ${tok.text}['${memberName43}'] via computed bracket notation — ` +
                    `the string literal hides the dangerous global name from SYN041 token-level detection; ` +
                    `the capability bypass is identical to ${tok.text}.${memberName43} at runtime; ` +
                    `use botscript stdlib equivalents with explicit uses {} declarations, ` +
                    `or wrap in unsafe "uses ${memberName43} via ${tok.text}['${memberName43}'] for <reason>" { ${tok.text}['${memberName43}'] }`,
                  rule: syn043.rule,
                  idiom: syn043.idiom,
                  rewrite: syn043.rewrite,
                });
              }
            }
            continue;
          }

          // Must be followed by `.` or `?.`
          if (!isDotGlob && !isOptChainGlob) continue;

          const memberIdxGlob = nextSignificant(tokens, nextIdxGlob + 1);
          const memberTokGlob = tokens[memberIdxGlob];
          if (!memberTokGlob || memberTokGlob.kind !== "ident") continue;

          const receiverGlob = tok.text;
          const sepGlob = isOptChainGlob ? "?." : ".";
          const memberNameGlob = memberTokGlob.text;

          const afterMemberIdxGlob = nextSignificant(tokens, memberIdxGlob + 1);
          const afterMemberGlob = tokens[afterMemberIdxGlob];
          const isEq38 = afterMemberGlob && afterMemberGlob.kind === "eq";
          const isCompound38 = afterMemberGlob && afterMemberGlob.kind === "operator" &&
            SYN038_COMPOUND_ASSIGNS.has(afterMemberGlob.text);

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const locGlob = locationOf(src, tok.start);

          // ── SYN038: property write ──
          if (isEq38 || isCompound38) {
            const assignOp38 = afterMemberGlob!.text;
            warnings.push({
              code: "SYN038",
              severity: "warning",
              file: null,
              line: locGlob.line,
              column: locGlob.column,
              start: tok.start,
              end: afterMemberGlob!.end,
              message:
                `fn '${decl.name}' writes to ${receiverGlob}${sepGlob}${memberNameGlob} ${assignOp38} — ` +
                `writing to the global object mutates ambient shared state invisible to the capability model; ` +
                `no uses {} / reads {} / writes {} declaration covers global scope writes; ` +
                `callers cannot see the dependency and tests cannot isolate it without mocking the global; ` +
                `pass state through explicit parameters and return values instead, ` +
                `or wrap in unsafe "writes ${receiverGlob}.${memberNameGlob} for <reason>" { ${receiverGlob}${sepGlob}${memberNameGlob} ${assignOp38} ... }`,
              rule: syn038.rule,
              idiom: syn038.idiom,
              rewrite: syn038.rewrite,
            });
          }

          // ── SYN041: dangerous member access via global receiver ──
          if (SYN041_DANGEROUS_MEMBERS.has(memberNameGlob)) {
            warnings.push({
              code: "SYN041",
              severity: "warning",
              file: null,
              line: locGlob.line,
              column: locGlob.column,
              start: tok.start,
              end: memberTokGlob.end,
              message:
                `fn '${decl.name}' accesses ${receiverGlob}${sepGlob}${memberNameGlob} — ` +
                `the ${receiverGlob} global receiver routes around the bare-identifier SYN check for ${memberNameGlob}; ` +
                `the capability bypass is identical at runtime; ` +
                `use botscript stdlib equivalents with explicit uses {} declarations, ` +
                `or wrap in unsafe "uses ${memberNameGlob} via ${receiverGlob} for <reason>" { ${receiverGlob}${sepGlob}${memberNameGlob} }`,
              rule: syn041.rule,
              idiom: syn041.idiom,
              rewrite: syn041.rewrite,
            });
          }

          break;
        }

        // ── SYN047: Node.js global receiver — global.<member> and global['<member>'] ──
        case "global": {
          // Exclude: member access on a local binding (`obj.global.fetch`), fn declarations.
          const prevIdxG47 = prevSignificant(tokens, i - 1);
          const prevG47 = tokens[prevIdxG47];
          if (prevG47 && ((prevG47.kind === "punct" && prevG47.text === ".") || prevG47.kind === "questionDot"))
            break;
          if (prevG47 && prevG47.kind === "keyword" && prevG47.text === "fn") break;
          if (prevG47 && prevG47.kind === "ident" && prevG47.text === "function") break;
          if (isFunctionStarDecl(tokens, prevIdxG47)) break;

          const nextIdxG47 = nextSignificant(tokens, i + 1);
          const nextG47 = tokens[nextIdxG47];
          const isDotG47 = nextG47 && nextG47.kind === "punct" && nextG47.text === ".";
          const isOptChainG47 = nextG47 && nextG47.kind === "questionDot";
          const isBracketG47 = nextG47 && nextG47.kind === "open" && nextG47.text === "[";

          if (isInsideRange(tok.start, unsafeRanges)) break;

          // ── SYN047: computed string bracket — global['fetch'] etc. ──
          if (isBracketG47) {
            const strIdx47 = nextSignificant(tokens, nextIdxG47 + 1);
            const strTok47 = tokens[strIdx47];
            if (strTok47 && strTok47.kind === "string") {
              const raw47 = strTok47.text;
              const memberName47 = raw47.slice(1, -1);
              if (SYN041_DANGEROUS_MEMBERS.has(memberName47)) {
                const loc47 = locationOf(src, tok.start);
                warnings.push({
                  code: "SYN047",
                  severity: "warning",
                  file: null,
                  line: loc47.line,
                  column: loc47.column,
                  start: tok.start,
                  end: strTok47.end,
                  message:
                    `fn '${decl.name}' accesses global['${memberName47}'] via computed bracket notation — ` +
                    `the Node.js global receiver with a string literal hides the dangerous global name from ` +
                    `SYN041–SYN046 token-level detection; the capability bypass is identical to ` +
                    `globalThis['${memberName47}'] at runtime; use botscript stdlib equivalents with ` +
                    `explicit uses {} declarations, ` +
                    `or wrap in unsafe "uses ${memberName47} via global['${memberName47}'] for <reason>" { global['${memberName47}'] }`,
                  rule: syn047.rule,
                  idiom: syn047.idiom,
                  rewrite: syn047.rewrite,
                });
              }
            }
            break;
          }

          if (!isDotG47 && !isOptChainG47) break;

          const memberIdxG47 = nextSignificant(tokens, nextIdxG47 + 1);
          const memberTokG47 = tokens[memberIdxG47];
          if (!memberTokG47 || memberTokG47.kind !== "ident") break;

          const sepG47 = isOptChainG47 ? "?." : ".";
          const memberNameG47 = memberTokG47.text;

          const afterMemberIdxG47 = nextSignificant(tokens, memberIdxG47 + 1);
          const afterMemberG47 = tokens[afterMemberIdxG47];
          const isEqG47 = afterMemberG47 && afterMemberG47.kind === "eq";
          const isCompoundG47 = afterMemberG47 && afterMemberG47.kind === "operator" &&
            SYN038_COMPOUND_ASSIGNS.has(afterMemberG47.text);

          const locG47 = locationOf(src, tok.start);

          // Property write: global.foo = val (parallel to SYN038 for Node global)
          if (isEqG47 || isCompoundG47) {
            const assignOpG47 = afterMemberG47!.text;
            warnings.push({
              code: "SYN047",
              severity: "warning",
              file: null,
              line: locG47.line,
              column: locG47.column,
              start: tok.start,
              end: memberTokG47.end,
              message:
                `fn '${decl.name}' writes global${sepG47}${memberNameG47} ${assignOpG47} ... — ` +
                `writing to the Node.js global object is an undeclared global side effect; ` +
                `no uses {} / reads {} / writes {} declaration covers global scope writes; ` +
                `callers cannot see the dependency; pass state through explicit parameters and return values, ` +
                `or wrap in unsafe "writes global.${memberNameG47} for <reason>" { global${sepG47}${memberNameG47} ${assignOpG47} ... }`,
              rule: syn047.rule,
              idiom: syn047.idiom,
              rewrite: syn047.rewrite,
            });
          }

          // Dangerous member access: global.fetch(url)
          if (SYN041_DANGEROUS_MEMBERS.has(memberNameG47)) {
            warnings.push({
              code: "SYN047",
              severity: "warning",
              file: null,
              line: locG47.line,
              column: locG47.column,
              start: tok.start,
              end: memberTokG47.end,
              message:
                `fn '${decl.name}' accesses global${sepG47}${memberNameG47} — ` +
                `the Node.js global receiver routes around all SYN041–SYN046 checks (those only watch ` +
                `globalThis, window, and self); the capability bypass is identical at runtime; ` +
                `use botscript stdlib equivalents with explicit uses {} declarations, ` +
                `or wrap in unsafe "uses ${memberNameG47} via Node global for <reason>" { global${sepG47}${memberNameG47} }`,
              rule: syn047.rule,
              idiom: syn047.idiom,
              rewrite: syn047.rewrite,
            });
          }

          break;
        }

        // ── SYN010: setTimeout / setInterval / queueMicrotask ────────────────
        default: {
          if (!TIMER_GLOBALS.has(tok.text)) continue;

          // Exclude property accesses: obj.setTimeout(...)
          const prevIdx10 = prevSignificant(tokens, i - 1);
          const prev10 = tokens[prevIdx10];
          if (prev10 && ((prev10.kind === "punct" && prev10.text === ".") || prev10.kind === "questionDot"))
            continue;

          // Exclude function/fn/function* declarations named setTimeout/setInterval/queueMicrotask
          if (prev10 && prev10.kind === "ident" && prev10.text === "function") continue;
          if (prev10 && prev10.kind === "keyword" && prev10.text === "fn") continue;
          if (isFunctionStarDecl(tokens, prevIdx10)) continue;

          // Must be followed by `(` or `?.(` — confirming this is a call, not a reference.
          let afterIdx10 = nextSignificant(tokens, i + 1);
          let afterTok10 = tokens[afterIdx10];
          if (afterTok10 && afterTok10.kind === "questionDot") {
            afterIdx10 = nextSignificant(tokens, afterIdx10 + 1);
            afterTok10 = tokens[afterIdx10];
          }
          if (!afterTok10 || !(afterTok10.kind === "open" && afterTok10.text === "(")) {
            const parenIdx10 = resolveParenGroupedCallIdx(tokens, i);
            if (parenIdx10 === null) continue;
            afterIdx10 = parenIdx10;
            afterTok10 = tokens[afterIdx10]!;
          }

          // Exclude method shorthands and class methods: { setTimeout(fn) { ... } }
          const closeParenIdx10 = afterTok10.matchedAt;
          if (closeParenIdx10 !== undefined) {
            const afterParenIdx10 = nextSignificant(tokens, closeParenIdx10 + 1);
            const afterParen10 = tokens[afterParenIdx10];
            if (
              afterParen10 &&
              ((afterParen10.kind === "open" && afterParen10.text === "{") ||
                (afterParen10.kind === "punct" && afterParen10.text === ":"))
            ) continue;
          }

          if (isInsideRange(tok.start, unsafeRanges)) continue;

          const loc10 = locationOf(src, tok.start);
          warnings.push({
            code: "SYN010",
            severity: "warning",
            file: null,
            line: loc10.line,
            column: loc10.column,
            start: tok.start,
            end: tok.end,
            message:
              `fn '${decl.name}' calls ${tok.text}() — ` +
              `${tok.text} schedules a callback that runs after the fn returns; ` +
              `any effects inside that callback are invisible to callers and cannot be declared in the fn header; ` +
              `wrap in unsafe "schedules deferred effect" { ${tok.text}(...) }`,
            rule: syn010.rule,
            idiom: syn010.idiom,
            rewrite: syn010.rewrite,
          });
          break;
        }
      }
    }
  }

  return { code: src, warnings };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
