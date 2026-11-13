/** Emit the declared REA load/F8 scenario for a freshly owned 9915 target.
 * node tools/reference/field-mask-scenario.mjs TARGET_ID > caller-owned-request.json
 * This tool only writes JSON to stdout; REA performs the declared browser actions.
 */
const [target] = process.argv.slice(2);
if (!target || process.argv.length !== 3 || !/^[A-Fa-f0-9]+$/.test(target))
  throw new Error('Supply one exact freshly discovered owned CDP target ID.');
console.log(
  JSON.stringify(
    {
      browser: { mode: 'connect', cdp_endpoint: 'http://127.0.0.1:9915', target_id: target },
      start_url: { url: 'http://127.0.0.1:3915/' },
      actions: [
        {
          step_id: 'load',
          action: 'click',
          locator: { kind: 'css', selector: '#configured' },
          timeout_ms: 15000,
        },
        {
          step_id: 'ready',
          action: 'wait_for',
          locator: { kind: 'css', selector: '#status[data-ready=true]' },
          state: 'visible',
          timeout_ms: 20000,
        },
        { step_id: 'settle', action: 'wait_for_timeout', duration_ms: 2000 },
        {
          step_id: 'focus',
          action: 'click',
          locator: { kind: 'css', selector: 'ruffle-player' },
          timeout_ms: 10000,
        },
        {
          step_id: 'probe',
          action: 'press',
          locator: { kind: 'css', selector: 'ruffle-player' },
          key: 'F8',
          timeout_ms: 15000,
        },
        {
          step_id: 'done',
          action: 'wait_for',
          locator: { kind: 'css', selector: '#trace:has-text("BT3_MASK_DONE")' },
          state: 'visible',
          timeout_ms: 2000,
        },
      ],
      capture: { at_end: ['dom', 'url'], events: ['console', 'page-errors'] },
    },
    null,
    2,
  ),
);
