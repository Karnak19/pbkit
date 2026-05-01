import "./style.css"

const app = document.querySelector<HTMLDivElement>("#app")

if (!app) {
  throw new Error("Missing #app element")
}

app.innerHTML = `
  <section class="shell">
    <div>
      <p class="eyebrow">pbkit playground</p>
      <h1>Drop a PocketBase schema JSON into this app.</h1>
      <p>
        Put your exported schema at <code>apps/playground/pb_schema.json</code>,
        then run <code>bun --filter @karnak19/playground generate</code>.
      </p>
    </div>
    <div class="panel">
      <span>Output</span>
      <code>apps/playground/src/generated</code>
    </div>
  </section>
`
