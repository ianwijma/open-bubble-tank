# T3 thread history report

Archived structured activity only; no billing estimates.

| Metric | Value |
|---|---:|
| Unique activity items | 35334 |
| Duplicate items removed | 0 |
| Observed run IDs | 151 |
| Recorded run metadata records | 193 |
| Text characters | 70373366 |
| Text words | 6370926 |
| Truncated items | 0 |
| Explicit usage records | 0 |

## Method and limits

Deduplicate by item ID, retaining the longest text. Dates prefer createdAt, then startedAt, otherwise updatedAt (which can reflect later edits). Word counts include code and quoted content. Tool calls require an explicit tool-name field; titles and prose are counted separately. Shell entry programs are inferred only from command_execution records beginning with the recorded shell command prefix; pipelines and nested commands are not exhaustively parsed. File matches are textual mentions. Read-command evidence is a heuristic, not proof of successful execution.

- Textual mentions do not prove a tool executed or a file was read.
- Archive pagination completeness must be checked against export manifests.
- Run/model metadata coverage is the number of deduplicated run records supplied; activity without matching run metadata has no model attribution.
- Token and cost figures are reported only as explicit recorded fields; no inferred billing.

## Activity types

- reasoning: 18757
- command_execution: 8943
- dynamic_tool: 3849
- assistant_message: 1994
- file_change: 757
- notification: 311
- todo_list: 208
- subagent: 180
- checkpoint: 136
- user_message: 70
- web_search: 65
- compaction: 46
- error: 9
- run_interrupt_request: 3
- run_interrupt_result: 3
- user_input_request: 2
- secret_request: 1

## Frequent words

- false: 43743
- const: 41801
- frame: 40123
- world: 38941
- name: 30459
- https: 29817
- com: 29567
- ianwijma: 29277
- matrix: 29233
- src: 28647
- number: 26206
- open-bubble-tank: 26161
- null: 25980
- depth: 25736
- import: 25402
- game: 25223
- true: 24215
- type: 23187
- github: 22739
- source: 22609
- tank: 21751
- await: 21331
- expect: 21095
- url: 21037
- ispo: 20890
- text: 20751
- original: 19982
- loc: 19232
- new: 19181
- test: 18918
- scale: 18757
- key: 18684
- return: 18583
- tests: 17441
- pass: 17368
- field: 17329
- browser: 17184
- rotation: 16593
- radius: 15825
- page: 15591

## File mentions

- docs/fidelity.md: 2379
- src/game/simulation/world.ts: 1717
- src/game/assets/asset-pack.ts: 1124
- reference-captures/ordinary-original-run/passive-console.json: 1062
- docs/architecture.md: 748
- 4616/fixture.js: 747
- tools/visual-fixtures.ts: 671
- src/components/game-shell.tsx: 669
- tools/fixtures/browser.ts: 620
- src/components/tank-creator.tsx: 614
- src/app/globals.css: 557
- docs/handoff.md: 551
- e2e/game.spec.ts: 489
- src/game/core/types.ts: 379
- src/game/simulation/weapons.ts: 369
- src/game/render/pixi-renderer.ts: 309
- e2e/screens.spec.ts: 307
- e2e/creator-controls.spec.ts: 293
- home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/export_scripts_deobf/scripts/TankViewerScreen.as: 292
- home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/export_scripts/scripts/BTAGameWorld.as: 291
- reference-captures/pr-progress.json: 276
- e2e/edit-flow.spec.ts: 274
- tools/capture-creator-reference.ts: 252
- tools/reference-player.ts: 230
- src/game/simulation/tank.ts: 228
- e2e/feedback.spec.ts: 226
- e2e/creator.spec.ts: 224
- tests/actor-parents.test.ts: 221
- e2e/creator-save.spec.ts: 214
- src/components/game-viewport.tsx: 214
- src/game/simulation/field-display.ts: 213
- home/ian/Projects/ianwijma/documented-bubble-tank-3/re/bt3/export_scripts_deobf/scripts/TankCreatorScreen.as: 210
- src/components/creator-controls.tsx: 198
- e2e/creator-enemy-stats.spec.ts: 189
- src/game/assets/swf-symbols.mjs: 186
- e2e/playthrough.spec.ts: 175
- e2e/creator-save-dialog.spec.ts: 170
- ../documented-bubble-tank-3/re/bt3/export_scripts_deobf/scripts/TankCreatorScreen.as: 169
- tests/world.test.ts: 167
- src/game/simulation/projectiles.ts: 166

## Pull requests mentioned or linked

- https://github.com/ianwijma/open-bubble-tank/pull/1
- https://github.com/ianwijma/open-bubble-tank/pull/10
- https://github.com/ianwijma/open-bubble-tank/pull/100
- https://github.com/ianwijma/open-bubble-tank/pull/101
- https://github.com/ianwijma/open-bubble-tank/pull/102
- https://github.com/ianwijma/open-bubble-tank/pull/103
- https://github.com/ianwijma/open-bubble-tank/pull/104
- https://github.com/ianwijma/open-bubble-tank/pull/105
- https://github.com/ianwijma/open-bubble-tank/pull/106
- https://github.com/ianwijma/open-bubble-tank/pull/107
- https://github.com/ianwijma/open-bubble-tank/pull/108
- https://github.com/ianwijma/open-bubble-tank/pull/109
- https://github.com/ianwijma/open-bubble-tank/pull/11
- https://github.com/ianwijma/open-bubble-tank/pull/110
- https://github.com/ianwijma/open-bubble-tank/pull/111
- https://github.com/ianwijma/open-bubble-tank/pull/112
- https://github.com/ianwijma/open-bubble-tank/pull/113
- https://github.com/ianwijma/open-bubble-tank/pull/114
- https://github.com/ianwijma/open-bubble-tank/pull/115
- https://github.com/ianwijma/open-bubble-tank/pull/116
- https://github.com/ianwijma/open-bubble-tank/pull/117
- https://github.com/ianwijma/open-bubble-tank/pull/118
- https://github.com/ianwijma/open-bubble-tank/pull/119
- https://github.com/ianwijma/open-bubble-tank/pull/12
- https://github.com/ianwijma/open-bubble-tank/pull/120
- https://github.com/ianwijma/open-bubble-tank/pull/121
- https://github.com/ianwijma/open-bubble-tank/pull/122
- https://github.com/ianwijma/open-bubble-tank/pull/123
- https://github.com/ianwijma/open-bubble-tank/pull/124
- https://github.com/ianwijma/open-bubble-tank/pull/125
- https://github.com/ianwijma/open-bubble-tank/pull/126
- https://github.com/ianwijma/open-bubble-tank/pull/127
- https://github.com/ianwijma/open-bubble-tank/pull/128
- https://github.com/ianwijma/open-bubble-tank/pull/129
- https://github.com/ianwijma/open-bubble-tank/pull/13
- https://github.com/ianwijma/open-bubble-tank/pull/130
- https://github.com/ianwijma/open-bubble-tank/pull/131
- https://github.com/ianwijma/open-bubble-tank/pull/132
- https://github.com/ianwijma/open-bubble-tank/pull/133
- https://github.com/ianwijma/open-bubble-tank/pull/134
- https://github.com/ianwijma/open-bubble-tank/pull/135
- https://github.com/ianwijma/open-bubble-tank/pull/136
- https://github.com/ianwijma/open-bubble-tank/pull/137
- https://github.com/ianwijma/open-bubble-tank/pull/138
- https://github.com/ianwijma/open-bubble-tank/pull/139
- https://github.com/ianwijma/open-bubble-tank/pull/14
- https://github.com/ianwijma/open-bubble-tank/pull/140
- https://github.com/ianwijma/open-bubble-tank/pull/141
- https://github.com/ianwijma/open-bubble-tank/pull/142
- https://github.com/ianwijma/open-bubble-tank/pull/143
- https://github.com/ianwijma/open-bubble-tank/pull/144
- https://github.com/ianwijma/open-bubble-tank/pull/145
- https://github.com/ianwijma/open-bubble-tank/pull/146
- https://github.com/ianwijma/open-bubble-tank/pull/147
- https://github.com/ianwijma/open-bubble-tank/pull/148
- https://github.com/ianwijma/open-bubble-tank/pull/149
- https://github.com/ianwijma/open-bubble-tank/pull/15
- https://github.com/ianwijma/open-bubble-tank/pull/150
- https://github.com/ianwijma/open-bubble-tank/pull/151
- https://github.com/ianwijma/open-bubble-tank/pull/152
- https://github.com/ianwijma/open-bubble-tank/pull/153
- https://github.com/ianwijma/open-bubble-tank/pull/154
- https://github.com/ianwijma/open-bubble-tank/pull/155
- https://github.com/ianwijma/open-bubble-tank/pull/156
- https://github.com/ianwijma/open-bubble-tank/pull/157
- https://github.com/ianwijma/open-bubble-tank/pull/158
- https://github.com/ianwijma/open-bubble-tank/pull/159
- https://github.com/ianwijma/open-bubble-tank/pull/16
- https://github.com/ianwijma/open-bubble-tank/pull/160
- https://github.com/ianwijma/open-bubble-tank/pull/161
- https://github.com/ianwijma/open-bubble-tank/pull/162
- https://github.com/ianwijma/open-bubble-tank/pull/163
- https://github.com/ianwijma/open-bubble-tank/pull/164
- https://github.com/ianwijma/open-bubble-tank/pull/165
- https://github.com/ianwijma/open-bubble-tank/pull/166
- https://github.com/ianwijma/open-bubble-tank/pull/17
- https://github.com/ianwijma/open-bubble-tank/pull/18
- https://github.com/ianwijma/open-bubble-tank/pull/19
- https://github.com/ianwijma/open-bubble-tank/pull/20
- https://github.com/ianwijma/open-bubble-tank/pull/21
- https://github.com/ianwijma/open-bubble-tank/pull/22
- https://github.com/ianwijma/open-bubble-tank/pull/23
- https://github.com/ianwijma/open-bubble-tank/pull/24
- https://github.com/ianwijma/open-bubble-tank/pull/25
- https://github.com/ianwijma/open-bubble-tank/pull/26
- https://github.com/ianwijma/open-bubble-tank/pull/27
- https://github.com/ianwijma/open-bubble-tank/pull/28
- https://github.com/ianwijma/open-bubble-tank/pull/29
- https://github.com/ianwijma/open-bubble-tank/pull/3
- https://github.com/ianwijma/open-bubble-tank/pull/30
- https://github.com/ianwijma/open-bubble-tank/pull/31
- https://github.com/ianwijma/open-bubble-tank/pull/32
- https://github.com/ianwijma/open-bubble-tank/pull/33
- https://github.com/ianwijma/open-bubble-tank/pull/34
- https://github.com/ianwijma/open-bubble-tank/pull/35
- https://github.com/ianwijma/open-bubble-tank/pull/36
- https://github.com/ianwijma/open-bubble-tank/pull/37
- https://github.com/ianwijma/open-bubble-tank/pull/38
- https://github.com/ianwijma/open-bubble-tank/pull/39
- https://github.com/ianwijma/open-bubble-tank/pull/4
- https://github.com/ianwijma/open-bubble-tank/pull/40
- https://github.com/ianwijma/open-bubble-tank/pull/41
- https://github.com/ianwijma/open-bubble-tank/pull/42
- https://github.com/ianwijma/open-bubble-tank/pull/43
- https://github.com/ianwijma/open-bubble-tank/pull/44
- https://github.com/ianwijma/open-bubble-tank/pull/45
- https://github.com/ianwijma/open-bubble-tank/pull/46
- https://github.com/ianwijma/open-bubble-tank/pull/47
- https://github.com/ianwijma/open-bubble-tank/pull/48
- https://github.com/ianwijma/open-bubble-tank/pull/49
- https://github.com/ianwijma/open-bubble-tank/pull/5
- https://github.com/ianwijma/open-bubble-tank/pull/50
- https://github.com/ianwijma/open-bubble-tank/pull/51
- https://github.com/ianwijma/open-bubble-tank/pull/52
- https://github.com/ianwijma/open-bubble-tank/pull/53
- https://github.com/ianwijma/open-bubble-tank/pull/54
- https://github.com/ianwijma/open-bubble-tank/pull/55
- https://github.com/ianwijma/open-bubble-tank/pull/56
- https://github.com/ianwijma/open-bubble-tank/pull/57
- https://github.com/ianwijma/open-bubble-tank/pull/58
- https://github.com/ianwijma/open-bubble-tank/pull/59
- https://github.com/ianwijma/open-bubble-tank/pull/6
- https://github.com/ianwijma/open-bubble-tank/pull/60
- https://github.com/ianwijma/open-bubble-tank/pull/61
- https://github.com/ianwijma/open-bubble-tank/pull/62
- https://github.com/ianwijma/open-bubble-tank/pull/63
- https://github.com/ianwijma/open-bubble-tank/pull/64
- https://github.com/ianwijma/open-bubble-tank/pull/65
- https://github.com/ianwijma/open-bubble-tank/pull/66
- https://github.com/ianwijma/open-bubble-tank/pull/67
- https://github.com/ianwijma/open-bubble-tank/pull/68
- https://github.com/ianwijma/open-bubble-tank/pull/69
- https://github.com/ianwijma/open-bubble-tank/pull/7
- https://github.com/ianwijma/open-bubble-tank/pull/70
- https://github.com/ianwijma/open-bubble-tank/pull/71
- https://github.com/ianwijma/open-bubble-tank/pull/72
- https://github.com/ianwijma/open-bubble-tank/pull/73
- https://github.com/ianwijma/open-bubble-tank/pull/74
- https://github.com/ianwijma/open-bubble-tank/pull/75
- https://github.com/ianwijma/open-bubble-tank/pull/76
- https://github.com/ianwijma/open-bubble-tank/pull/77
- https://github.com/ianwijma/open-bubble-tank/pull/78
- https://github.com/ianwijma/open-bubble-tank/pull/79
- https://github.com/ianwijma/open-bubble-tank/pull/8
- https://github.com/ianwijma/open-bubble-tank/pull/80
- https://github.com/ianwijma/open-bubble-tank/pull/81
- https://github.com/ianwijma/open-bubble-tank/pull/82
- https://github.com/ianwijma/open-bubble-tank/pull/83
- https://github.com/ianwijma/open-bubble-tank/pull/84
- https://github.com/ianwijma/open-bubble-tank/pull/85
- https://github.com/ianwijma/open-bubble-tank/pull/86
- https://github.com/ianwijma/open-bubble-tank/pull/87
- https://github.com/ianwijma/open-bubble-tank/pull/88
- https://github.com/ianwijma/open-bubble-tank/pull/89
- https://github.com/ianwijma/open-bubble-tank/pull/9
- https://github.com/ianwijma/open-bubble-tank/pull/90
- https://github.com/ianwijma/open-bubble-tank/pull/91
- https://github.com/ianwijma/open-bubble-tank/pull/92
- https://github.com/ianwijma/open-bubble-tank/pull/93
- https://github.com/ianwijma/open-bubble-tank/pull/94
- https://github.com/ianwijma/open-bubble-tank/pull/95
- https://github.com/ianwijma/open-bubble-tank/pull/96
- https://github.com/ianwijma/open-bubble-tank/pull/97
- https://github.com/ianwijma/open-bubble-tank/pull/98
- https://github.com/ianwijma/open-bubble-tank/pull/99
- https://github.com/ianwijma/price-tracker/pull/3
- https://github.com/org/repo/pull/123
- https://github.com/ruffle-rs/ruffle/pull/23011

Recorded usage fields: 0. No token/cost total is inferred. Full evidence and distributions are in stats.json.

Recorded per-turn usage (context snapshots excluded):

```json
{
  "providerTurns": 439,
  "coveredTurns": 432,
  "semanticsEvidence": "Current local T3 source apps/server/src/provider/CodexTurnTokenUsage.ts accumulates per-active-turn deltas and clears at completion (lines97–136); source checkout is not proof of historical runtime version.",
  "scope": "Recorded main-agent per-turn usage only; excludes unrecorded/subagent usage. Context snapshots excluded.",
  "totals": {
    "inputTokens": 2234304908,
    "outputTokens": 6809521,
    "cachedInputTokens": 2210289920,
    "cacheCreationTokens": 0,
    "reasoningTokens": 4043446
  },
  "cost": "Unavailable: no billing fields recorded."
}
```
