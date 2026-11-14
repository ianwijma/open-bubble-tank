import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const count = (map, key) => {
  if (key) map[key] = (map[key] || 0) + 1;
};
const ranked = (map, limit = 25) =>
  Object.entries(map)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit);
const walk = (dir) =>
  fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? e.name === 'api-validation'
          ? []
          : walk(path.join(dir, e.name))
        : e.name.endsWith('.json')
          ? [path.join(dir, e.name)]
          : [],
    );
export function analyze(pages) {
  const unique = new Map();
  let raw = 0;
  const runs = new Map();
  const prs = new Set();
  for (const source of pages) {
    const page = source.structuredContent || source;
    for (const run of page.runs || page.recentRuns || [])
      runs.set(run.runId || run.id || run.run_id || JSON.stringify(run), run.payload || run);
    for (const pr of page.thread?.pullRequests || []) if (pr.url) prs.add(pr.url);
    for (const wrapper of page.items || page.history?.items || []) {
      const payload = wrapper.payload;
      const item = payload
        ? {
            ...wrapper,
            ...payload,
            itemId: wrapper.itemId || payload.id,
            text:
              payload.text ||
              [payload.input, payload.output, payload.prompt, payload.result]
                .filter((v) => v != null)
                .map((v) => (typeof v === 'string' ? v : JSON.stringify(v)))
                .join('\n'),
          }
        : wrapper;
      raw++;
      const key = item.itemId || item.id || `${item.sourceThreadId}:${item.position}`;
      const old = unique.get(key);
      if (!old || (item.text?.length || 0) > (old.text?.length || 0)) unique.set(key, item);
    }
  }
  const s = {
    scope: 'Archived structured activity only; no billing estimates.',
    rawItems: raw,
    uniqueItems: unique.size,
    duplicates: raw - unique.size,
    roles: {},
    types: {},
    days: {},
    toolCalls: {},
    toolTitleCandidates: {},
    inferredShellPrograms: {},
    words: {},
    fileMentions: {},
    readCommandEvidence: [],
    delegationEvidence: [],
    subagents: [],
    errors: [],
    goals: [],
    models: {},
    runIds: [],
    pullRequests: [],
    textCharacters: 0,
    textWords: 0,
    truncatedItems: 0,
    usageRecords: [],
    limits: [
      'Textual mentions do not prove a tool executed or a file was read.',
      'Archive pagination completeness must be checked against export manifests.',
      'Run/model metadata coverage is the number of deduplicated run records supplied; activity without matching run metadata has no model attribution.',
      'Token and cost figures are reported only as explicit recorded fields; no inferred billing.',
    ],
  };
  const stop = new Set(
    'the and for that this with from you your are was have will not but can into then all has its our how use run'.split(
      ' ',
    ),
  );
  const ids = new Set();
  for (const item of unique.values()) {
    count(
      s.roles,
      item.type === 'user_message'
        ? 'user'
        : item.type === 'assistant_message' || item.type === 'reasoning'
          ? 'assistant'
          : item.createdBy || item.role || 'system/tool',
    );
    count(s.types, item.type || 'unknown');
    if (item.runId) ids.add(item.runId);
    const date = item.createdAt || item.startedAt || item.updatedAt;
    if (date && !Number.isNaN(Date.parse(date)))
      count(s.days, new Date(date).toISOString().slice(0, 10));
    const text = item.text || '';
    s.textCharacters += text.length;
    const words = text.match(/[A-Za-z][A-Za-z'-]{2,}/g) || [];
    s.textWords += words.length;
    for (const w of words) {
      const v = w.toLowerCase();
      if (!stop.has(v)) count(s.words, v);
    }
    if (item.textTruncated) s.truncatedItems++;
    const tool = item.toolName || item.tool?.name || item.toolCall?.name || item.function?.name;
    if (tool) count(s.toolCalls, tool);
    if (item.type === 'subagent')
      s.subagents.push({
        itemId: item.itemId,
        subagentId: item.subagentId,
        childThreadId: item.childThreadId,
        title: item.title,
        status: item.status,
      });
    if (item.type === 'command_execution') {
      const shell =
        `$ ${typeof item.input === 'string' ? item.input : text.replace(/^\$ /, '')}`.match(
          /^\$ \/bin\/(?:ba)?sh -lc ["'](?:[A-Z_][A-Z_0-9]*=[^ ]+ )*([\w.-]+)/,
        );
      if (shell) count(s.inferredShellPrograms, shell[1]);
    }
    if (/tool|command/i.test(item.type || '') && item.title)
      count(s.toolTitleCandidates, item.title);
    for (const match of text.matchAll(
      /(?:[\w.@-]+\/)+[\w.@-]+\.(?:tsx?|jsx?|mjs|json|md|css|html|py|sh|ya?ml|toml|as)\b/g,
    ))
      count(s.fileMentions, match[0]);
    for (const line of text.split('\n'))
      if (
        /\b(?:cat|sed\s+-n|head|tail|rg|read_file)\b/.test(line) &&
        /\b(?:cmd|command|tool|cat|sed|read_file)\b/.test(line)
      )
        s.readCommandEvidence.push({
          itemId: item.itemId,
          position: item.position,
          line: line.slice(0, 500),
          basis: tool
            ? 'structured tool item text'
            : 'textual command evidence; execution unverified',
        });
    if (
      /spawn_agent|followup_task|delegate|sub.agent/i.test(
        `${tool || ''} ${item.title || ''} ${text}`,
      )
    )
      s.delegationEvidence.push({
        itemId: item.itemId,
        position: item.position,
        title: item.title || '',
        structuredTool: tool || null,
      });
    if (/error|failed|failure/i.test(`${item.status || ''} ${item.type || ''}`))
      s.errors.push({
        itemId: item.itemId,
        status: item.status,
        type: item.type,
        title: item.title,
      });
    if (/goal/i.test(item.type || ''))
      s.goals.push({
        itemId: item.itemId,
        type: item.type,
        title: item.title,
        status: item.status,
      });
    for (const match of text.matchAll(/https:\/\/github\.com\/[\w.-]+\/[\w.-]+\/pull\/\d+/g))
      prs.add(match[0]);
    for (const key of [
      'usage',
      'tokenUsage',
      'cost',
      'costUsd',
      'inputTokens',
      'outputTokens',
      'totalTokens',
    ])
      if (item[key] !== undefined)
        s.usageRecords.push({ itemId: item.itemId, field: key, value: item[key] });
  }
  for (const run of runs.values()) {
    count(
      s.models,
      run.modelSelection?.model || (typeof run.model === 'string' ? run.model : run.model?.id),
    );
    for (const key of [
      'usage',
      'tokenUsage',
      'cost',
      'costUsd',
      'inputTokens',
      'outputTokens',
      'totalTokens',
    ])
      if (run[key] !== undefined)
        s.usageRecords.push({ runId: run.runId || run.id, field: key, value: run[key] });
  }
  s.runIds = [...ids];
  s.observedRuns = ids.size;
  s.recentRunMetadataCount = runs.size;
  s.pullRequests = [...prs].sort();
  s.topWords = ranked(s.words, 40);
  s.topFiles = ranked(s.fileMentions, 40);
  delete s.words;
  return s;
}
const esc = (x) =>
  String(x)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
export function markdown(s) {
  return `# T3 thread history report\n\n${s.scope}\n\n| Metric | Value |\n|---|---:|\n${Object.entries(
    {
      'Unique activity items': s.uniqueItems,
      'Duplicate items removed': s.duplicates,
      'Observed run IDs': s.observedRuns,
      'Recorded run metadata records': s.recentRunMetadataCount,
      'Text characters': s.textCharacters,
      'Text words': s.textWords,
      'Truncated items': s.truncatedItems,
      'Explicit usage records': s.usageRecords.length,
    },
  )
    .map(([k, v]) => `| ${k} | ${v} |`)
    .join(
      '\n',
    )}\n\n## Method and limits\n\nDeduplicate by item ID, retaining the longest text. Dates prefer createdAt, then startedAt, otherwise updatedAt (which can reflect later edits). Word counts include code and quoted content. Tool calls require an explicit tool-name field; titles and prose are counted separately. Shell entry programs are inferred only from command_execution records beginning with the recorded shell command prefix; pipelines and nested commands are not exhaustively parsed. File matches are textual mentions. Read-command evidence is a heuristic, not proof of successful execution.\n\n${s.limits.map((x) => `- ${x}`).join('\n')}\n\n## Activity types\n\n${ranked(
    s.types,
    100,
  )
    .map(([k, v]) => `- ${k}: ${v}`)
    .join(
      '\n',
    )}\n\n## Frequent words\n\n${s.topWords.map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n\n## File mentions\n\n${s.topFiles.map(([k, v]) => `- ${k}: ${v}`).join('\n')}\n\n## Pull requests mentioned or linked\n\n${s.pullRequests.map((x) => `- ${x}`).join('\n')}\n\nRecorded usage fields: ${s.usageRecords.length}. No token/cost total is inferred. Full evidence and distributions are in stats.json.\n\nRecorded per-turn usage (context snapshots excluded):\n\n\`\`\`json\n${JSON.stringify(s.recordedTokens || {}, null, 2)}\n\`\`\`\n`;
}
export function html(s) {
  const bars = (data, chronological = false) => {
    const rows = chronological
        ? Object.entries(data).sort(([a], [b]) => a.localeCompare(b))
        : ranked(data, 18),
      max = Math.max(1, ...rows.map((x) => x[1]));
    return (
      rows
        .map(
          ([k, v]) =>
            `<div class="bar"><span title="${esc(k)}">${esc(k)}</span><i style="width:${(v / max) * 100}%"></i><b>${v}</b></div>`,
        )
        .join('') || '<p>No explicit records in archive.</p>'
    );
  };
  return `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>T3 history report</title><style>:root{--foreground:#dce5ed;--muted:#8c9aa9;--card:#18232e;--border:#344352;--primary:#6dbcf5;--chart-1:#6dbcf5;--radius:10px;--font-sans:system-ui}*{box-sizing:border-box}body{margin:0;color:var(--foreground);font:14px var(--font-sans);background:transparent}h1{font-size:24px}h2{font-size:17px}p{line-height:1.6}.muted{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.card{border:1px solid var(--border);border-radius:var(--radius);padding:18px;min-width:0}.metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0}.metric strong{display:block;font-size:26px}.chart{height:400px;overflow:auto}.bar{display:grid;grid-template-columns:minmax(90px,42%) 1fr 45px;align-items:center;gap:8px;margin:8px 0}.bar span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bar i{display:block;background:var(--chart-1);height:9px;border-radius:5px}.bar b{text-align:right;font-weight:400}a{color:var(--primary)}details{margin:14px 0}pre{white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px}@media(max-width:650px){.grid{grid-template-columns:1fr}.metrics{grid-template-columns:repeat(2,1fr)}}</style><main><h1>Faithful Offline Game Recreation · activity archive</h1><p class="muted">Retrospective evidence from exported T3 history. ${s.uniqueItems.toLocaleString()} unique activity items; ${s.duplicates} overlapping records removed.</p><div class="metrics">${[
    ['Observed runs', s.observedRuns],
    ['Text words', s.textWords],
    ['PR links', s.pullRequests.length],
    ['Usage-covered turns', s.recordedTokens?.coveredTurns || 0],
  ]
    .map(([k, v]) => `<div class="card metric"><strong>${v.toLocaleString()}</strong>${k}</div>`)
    .join('')}</div><div class="grid">${[
    ['Activity types', s.types],
    ['Roles (message types preferred; other source actors preserved)', s.roles],
    ['Daily activity (updated date fallback)', s.days],
    ['Explicit tool names', s.toolCalls],
    ['Shell entry programs (inferred from execution records)', s.inferredShellPrograms],
    ['Frequent words', Object.fromEntries(s.topWords)],
    ['File mentions (not confirmed reads)', Object.fromEntries(s.topFiles)],
    ['Tool-like titles (not executed-call counts)', s.toolTitleCandidates],
    ['Models in recorded run metadata', s.models],
  ]
    .map(
      ([title, data]) =>
        `<section class="card"><h2>${title}</h2><div class="chart">${bars(data, title.startsWith('Daily activity'))}</div></section>`,
    )
    .join(
      '',
    )}</div><section><h2>Method and coverage</h2><p>Deduplicated by item ID, retaining longest text. Dates prefer createdAt, then startedAt, and fall back to updatedAt. Text includes code, quotations, and repeated context. ${s.truncatedItems} items are marked truncated. ${s.recentRunMetadataCount} run records carry metadata; ${s.observedRuns} run IDs occur in activity. Tool counts require explicit fields; titles are shown separately. Message roles prefer user_message and assistant_message/reasoning types; other items preserve recorded source actors when present. Hover chart labels to read full names. No token or billing estimates are invented.</p><ul>${s.limits.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><h2>Recorded main-agent tokens</h2><p>Per-turn recorded coverage: ${s.recordedTokens?.coveredTurns || 0} / ${s.recordedTokens?.providerTurns || 0} provider turns. Cached input is a subset of input; reasoning may be a subset of output. These values must not be added together. Subagent usage and actual billing are unavailable.</p><div class="metrics">${Object.entries(
    s.recordedTokens?.totals || {},
  )
    .map(
      ([k, v]) => `<div class="card metric"><strong>${v.toLocaleString()}</strong>${esc(k)}</div>`,
    )
    .join(
      '',
    )}</div><details><summary>Usage details</summary><pre>${esc(JSON.stringify(s.recordedTokens || { status: 'No per-turn usage archive supplied' }, null, 2))}</pre></details><details><summary>Pull request links (${s.pullRequests.length})</summary>${s.pullRequests.map((x) => `<p><a href="${esc(x)}">${esc(x)}</a></p>`).join('')}</details><details><summary>Read-command textual evidence (${s.readCommandEvidence.length})</summary><pre>${esc(JSON.stringify(s.readCommandEvidence, null, 2))}</pre></details><details><summary>Structured subagents (${s.subagents.length})</summary><pre>${esc(JSON.stringify(s.subagents, null, 2))}</pre></details><details><summary>Delegation references (${s.delegationEvidence.length})</summary><pre>${esc(JSON.stringify(s.delegationEvidence, null, 2))}</pre></details><details><summary>Error-status items (${s.errors.length}), goal items (${s.goals.length}), explicit usage records (${s.usageRecords.length})</summary><pre>${esc(JSON.stringify({ errors: s.errors, goals: s.goals, usage: s.usageRecords }, null, 2))}</pre></details></section></main></html>`;
}
export function generate(input = 'docs/thread-report/history', output = 'docs/thread-report') {
  const files = walk(input);
  const loaded = files.map((f) => ({ file: f, data: JSON.parse(fs.readFileSync(f, 'utf8')) }));
  const continuations = new Map();
  for (const { file, data } of loaded) {
    const match = path.basename(file).match(/^continuation-(\d+)-(\d+)\.json$/);
    if (match) {
      const page = data.structuredContent || data;
      for (const item of page.items || []) {
        const key = item.itemId || item.id;
        const chunks = continuations.get(key) || [];
        chunks.push({
          offset: Number(match[2]),
          text: item.text || '',
          truncated: item.textTruncated,
        });
        continuations.set(key, chunks);
      }
    }
  }
  const pages = loaded
    .filter((x) => !path.basename(x.file).startsWith('continuation-'))
    .map((x) => x.data);
  for (const raw of pages) {
    const page = raw.structuredContent || raw;
    for (const item of page.items || []) {
      const chunks = continuations.get(item.itemId || item.id) || [];
      for (const chunk of chunks.sort((a, b) => a.offset - b.offset)) {
        if (chunk.offset === (item.text || '').length) {
          item.text = (item.text || '') + chunk.text;
          item.textTruncated = chunk.truncated;
        }
      }
    }
  }
  const s = analyze(pages);
  const recorded = pages.find((p) => p.providerTurns);
  if (recorded) {
    const turns = recorded.providerTurns;
    const covered = [
      ...new Map(
        turns.map((t) => [t.provider_turn_id || t.payload?.id || JSON.stringify(t), t]),
      ).values(),
    ].filter((t) => t.payload?.turnTokenUsage?.usageScope === 'main_agent');
    s.recordedTokens = {
      providerTurns: turns.length,
      coveredTurns: covered.length,
      semanticsEvidence:
        'Current local T3 source apps/server/src/provider/CodexTurnTokenUsage.ts accumulates per-active-turn deltas and clears at completion (lines97–136); source checkout is not proof of historical runtime version.',
      scope:
        'Recorded main-agent per-turn usage only; excludes unrecorded/subagent usage. Context snapshots excluded.',
      totals: {},
      cost: 'Unavailable: no billing fields recorded.',
    };
    for (const t of covered)
      for (const key of [
        'inputTokens',
        'outputTokens',
        'cachedInputTokens',
        'cacheCreationTokens',
        'reasoningTokens',
      ]) {
        const value = t.payload.turnTokenUsage[key];
        if (typeof value === 'number')
          s.recordedTokens.totals[key] = (s.recordedTokens.totals[key] || 0) + value;
      }
  }
  s.sourceFiles = files;
  s.generatedAt = new Date().toISOString();
  fs.mkdirSync(output, { recursive: true });
  fs.writeFileSync(path.join(output, 'stats.json'), JSON.stringify(s, null, 2) + '\n');
  fs.writeFileSync(path.join(output, 'report.md'), markdown(s));
  fs.writeFileSync(path.join(output, 'report.html'), html(s));
  return s;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const s = generate(process.argv[2], process.argv[3]);
  console.log(`Generated report: ${s.uniqueItems} unique items, ${s.sourceFiles.length} files`);
}
