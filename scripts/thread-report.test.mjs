import { test } from 'node:test';
import assert from 'node:assert/strict';
import { analyze, html, markdown } from './thread-report.mjs';
test('deduplicates overlap, separates explicit tools from prose, preserves evidence and escapes HTML', () => {
  const s = analyze([
    {
      items: [
        {
          itemId: 'a',
          type: 'message',
          createdBy: 'user',
          text: 'cat src/game.ts spawn_agent <script>',
          runId: 'r1',
          updatedAt: '2026-01-02T00:00:00Z',
        },
        {
          itemId: 'b',
          type: 'tool',
          toolName: 'exec_command',
          text: 'cat src/game.ts',
          usage: { inputTokens: 12 },
        },
      ],
    },
    { items: [{ itemId: 'a', text: 'short' }], recentRuns: [{ id: 'r1', model: 'sol' }] },
  ]);
  assert.equal(s.uniqueItems, 2);
  assert.equal(s.duplicates, 1);
  assert.equal(s.toolCalls.exec_command, 1);
  assert.equal(s.toolCalls.spawn_agent, undefined);
  assert.equal(s.fileMentions['src/game.ts'], 2);
  assert.equal(s.usageRecords.length, 1);
  assert.equal(s.observedRuns, 1);
  assert.equal(s.days['2026-01-02'], 1);
  assert.equal(s.readCommandEvidence.length, 2);
  assert.ok(html(s).includes('&lt;script&gt;'));
  assert.ok(markdown(s).includes('No token/cost total is inferred'));
});

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { generate } from './thread-report.mjs';
test('stitches continuation offsets and excludes cumulative snapshots from additive token totals', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'thread-report-'));
  const out = path.join(dir, 'out');
  try {
    fs.writeFileSync(
      path.join(dir, 'page.json'),
      JSON.stringify({
        structuredContent: {
          items: [
            {
              itemId: 'x',
              type: 'command_execution',
              text: '$ /bin/bash -lc "cat ',
              textTruncated: true,
            },
          ],
        },
      }),
    );
    fs.writeFileSync(
      path.join(dir, 'continuation-0-21.json'),
      JSON.stringify({ items: [{ itemId: 'x', text: 'src/a.ts"', textTruncated: false }] }),
    );
    fs.writeFileSync(
      path.join(dir, 'usage.json'),
      JSON.stringify({
        providerTurns: [
          {
            payload: {
              tokenUsage: { inputTokens: 9999 },
              turnTokenUsage: {
                usageScope: 'main_agent',
                inputTokens: 42,
                outputTokens: 5,
                cachedInputTokens: 12,
              },
            },
          },
        ],
        runs: [],
      }),
    );
    const s = generate(dir, out);
    assert.equal(s.uniqueItems, 1);
    assert.equal(s.truncatedItems, 0);
    assert.equal(s.inferredShellPrograms.cat, 1);
    assert.equal(s.fileMentions['src/a.ts'], 1);
    assert.equal(s.recordedTokens.totals.inputTokens, 42);
    assert.equal(s.recordedTokens.coveredTurns, 1);
    assert.ok(fs.existsSync(path.join(out, 'report.html')));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('normalizes SQLite payloads with exact tool and subagent evidence', () => {
  const s = analyze([
    {
      items: [
        {
          position: 1,
          itemId: 'a',
          text: null,
          payload: {
            id: 'a',
            type: 'dynamic_tool',
            toolName: 't3-code.delegate_task',
            input: { task: 'inspect src/a.ts' },
            output: { ok: true },
            startedAt: '2026-02-01T00:00:00Z',
          },
        },
        {
          position: 2,
          itemId: 'b',
          payload: {
            type: 'subagent',
            subagentId: 'agent1',
            childThreadId: 'child1',
            status: 'completed',
          },
        },
      ],
    },
  ]);
  assert.equal(s.toolCalls['t3-code.delegate_task'], 1);
  assert.equal(s.subagents[0].subagentId, 'agent1');
  assert.equal(s.fileMentions['src/a.ts'], 1);
  assert.equal(s.days['2026-02-01'], 1);
});
