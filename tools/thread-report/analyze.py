#!/usr/bin/env python3
"""Validate the frozen history manifest and rebuild stats, Markdown and HTML offline."""
from __future__ import annotations
import argparse
from collections import Counter, defaultdict
from datetime import datetime, timedelta
import gzip
import hashlib
import html
import json
from pathlib import Path
import re
import shlex

ROOT = Path(__file__).resolve().parents[2]
FIELDS = ('inputTokens', 'cachedInputTokens', 'cacheCreationTokens', 'outputTokens', 'reasoningTokens')
STOP = set('the a an and or to of in for is are was were be been with on as at by from it this that these those not no but if then than we i you they its into through can will has have had do does did all any only also same each both their them our your before after still now more other which when where while without within so up out per over under exact current local original source evidence retained remaining unchanged actual pass passes passing full complete check checks browser field runtime'.split())
PATH_RE = re.compile(r'(?<![\w./])(?:[\w.@+~-]+/)*[\w.@+~-]+\.(?:tsx?|jsx?|mjs|cjs|json|md|py|rs|as|ya?ml|toml|css|html|sh|txt|csv|sql)(?![\w.])', re.I)
READ_RE = re.compile(r'\b(?:cat|sed|head|tail|rg|grep|less|more|readFile(?:Sync)?|read_text|read_bytes|open)\b')

def stamp(value):
    if not value: return None
    try: return datetime.fromisoformat(value.replace('Z', '+00:00')).timestamp()
    except (ValueError, AttributeError): return None

def ordered(counter):
    return dict(sorted(counter.items(), key=lambda kv: (-kv[1], kv[0])))

def strings(value):
    if isinstance(value, str): yield value
    elif isinstance(value, dict):
        for v in value.values(): yield from strings(v)
    elif isinstance(value, list):
        for v in value: yield from strings(v)

def paths(text):
    found = set()
    for match in PATH_RE.finditer(text):
        p = match.group().lstrip('./')
        # Normalize checkout-specific prefixes, keeping research paths distinct.
        for prefix in ('src/', 'docs/', 'tools/', 'tests/', 'e2e/', '.github/'):
            at = p.find('/' + prefix)
            if at >= 0:
                p = p[at + 1:]; break
        if not p.startswith(('https:', 'http:')): found.add(p)
    return found

def command_program(command):
    try: tokens = shlex.split(command)
    except ValueError: return 'unparsed'
    if not tokens: return 'empty'
    if Path(tokens[0]).name in {'bash', 'sh', 'zsh'} and len(tokens) >= 3 and 'c' in tokens[1]:
        return command_program(tokens[2])
    i = 0
    while i < len(tokens) and re.match(r'^[A-Za-z_]\w*=', tokens[i]): i += 1
    return Path(tokens[i]).name if i < len(tokens) else 'assignment'

def goal(text):
    if re.search(r'\b(test|playwright|pytest|typecheck|format|check)\b', text): return 'Validation / formatting'
    if re.search(r'\b(gh|git push|pull_request|workflow_run)\b', text): return 'GitHub / delivery'
    if re.search(r'\b(rea|capture|reference|decompile)\b', text): return 'Reference / runtime research'
    if READ_RE.search(text): return 'Inspection / search'
    if re.search(r'\b(apply_patch|write_text|writeFile|mkdir|cp)\b', text): return 'Editing / files'
    return 'Other'

def usage_total(rows):
    totals = Counter(); coverage = Counter(); models = Counter()
    seen = set()
    for r in rows:
        key = (r['thread_id'], r['item_id'])
        if key in seen: raise ValueError(f'duplicate usage identity: {key}')
        seen.add(key)
        u = r['payload'].get('usage', {})
        coverage['provider_turns'] += 1
        if not u:
            coverage['missing'] += 1; continue
        scope = u.get('usageScope')
        if scope != 'main_agent':
            coverage['excluded_ambiguous_scope'] += 1; continue
        coverage[u.get('usageStatus', 'unknown')] += 1
        for k in FIELDS:
            v = u.get(k, 0)
            if not isinstance(v, int) or v < 0: raise ValueError(f'invalid usage {k}')
            totals[k] += v
        reported = u.get('models', [])
        fallback = reported[0] if isinstance(reported, list) and len(reported) == 1 and isinstance(reported[0], str) else None
        models[r['payload'].get('model') or fallback or 'unattributed'] += 1
    if totals['cachedInputTokens'] + totals['cacheCreationTokens'] > totals['inputTokens']:
        raise ValueError('cached/write counts exceed input; semantics need review')
    totals['uncachedInputTokens'] = totals['inputTokens'] - totals['cachedInputTokens'] - totals['cacheCreationTokens']
    totals['inputPlusOutputTokens'] = totals['inputTokens'] + totals['outputTokens']
    return {'totals': dict(totals), 'coverage': dict(coverage), 'model_turns': ordered(models)}

def cost(t, input_rate=2, cached_rate=.1, output_rate=10, write_rate=2.5):
    # Reasoning is a subset of output, never charged again.
    return (t.get('uncachedInputTokens', 0)*input_rate + t.get('cachedInputTokens', 0)*cached_rate + t.get('cacheCreationTokens', 0)*write_rate + t.get('outputTokens', 0)*output_rate)/1e6

def load_rows(base):
    m = json.loads((base/'manifest.json').read_text(encoding='utf-8'))
    digest = hashlib.sha256(''.join(f"{f['path']}\0{f['sha256']}\n" for f in m['files']).encode()).hexdigest()
    if digest != m['archive_sha256']: raise ValueError('archive manifest hash mismatch')
    rows = []; seen = set()
    for f in m['files']:
        path = base/f['path']
        if hashlib.sha256(path.read_bytes()).hexdigest() != f['sha256']: raise ValueError(f'file hash mismatch: {path}')
        if f['format'] != 'jsonl.gz': continue
        count = 0
        with gzip.open(path, 'rt', encoding='utf-8') as stream:
            for line in stream:
                row = json.loads(line); key = (row['thread_id'], row['item_id'], row['type'])
                if key in seen: raise ValueError(f'duplicate record: {key}')
                seen.add(key); rows.append(row); count += 1
                if row['type'] == 'reasoning' and row['payload'] != {'content_omitted': True}: raise ValueError('reasoning content in archive')
        if count != f['records']: raise ValueError(f'count mismatch: {path}')
    if len(rows) != m['counts']['records']: raise ValueError('total count mismatch')
    validate_coverage(m, rows)
    listed = {f['path'] for f in m['files']}
    present = {p.relative_to(base).as_posix() for pattern in ('jsonl/*.jsonl.gz', 'transcript/*.md') for p in base.glob(pattern)}
    if present != listed: raise ValueError('unlisted or missing archive shards')
    return m, rows

def validate_coverage(m, rows):
    """Check manifest summary claims against the archived identities and sources."""
    coverage = m['coverage']['threads']
    ids = [c['thread_id'] for c in coverage]
    if len(set(ids)) != len(ids) or len(ids) != m['counts']['threads']:
        raise ValueError('thread count mismatch')
    counts = Counter(r['thread_id'] for r in rows)
    timelines = Counter(r['thread_id'] for r in rows if r['source'] == 'projection_turn_items')
    if set(counts) - set(ids): raise ValueError('undeclared thread identity')
    missing = []
    for entry in coverage:
        tid = entry['thread_id']
        if counts[tid] != entry['records']: raise ValueError('thread record count mismatch')
        retrievable = timelines[tid] > 0
        if retrievable != entry['retrievable']: raise ValueError('thread timeline coverage mismatch')
        if not retrievable: missing.append(tid)
    if sorted(missing) != sorted(m['coverage']['missing_threads']):
        raise ValueError('missing thread count mismatch')
    if Counter(r['type'] for r in rows) != m['counts']['by_type']:
        raise ValueError('record kind count mismatch')

def analyze(m, rows):
    result = {'archive_sha256': m['archive_sha256'], 'records': len(rows), 'threads': m['counts']['threads'], 'child_threads': m['counts']['threads']-1, 'archive_bytes': sum(f['bytes'] for f in m['files']), 'archive_files': len(m['files']), 'missing_threads': m['coverage']['missing_threads'], 'exclusions': m['exclusions']}
    buckets = {}
    for scope, selected in [('all', rows), ('root', [r for r in rows if r['depth'] == 0])]:
        kinds=Counter(); statuses=Counter(); tools=Counter(); programs=Counter(); goals=Counter(); readpaths=Counter(); mentions=Counter(); writes=Counter(); words=Counter(); selected_words=Counter(); daily=defaultdict(Counter); runs=Counter(); roles=Counter(); command_hashes=Counter(); times=[]; tool_seconds=0; command_seconds=0; durations=[]; msg_chars=Counter(); urls=set()
        for r in selected:
            k=r['type']; p=r['payload']; kinds[k]+=1
            if r['source']=='projection_turn_items': statuses[r['status']]+=1
            date = (p.get('startedAt') or r.get('updated_at') or '')[:10]
            if date:
                daily[date]['records']+=1
                if k in {'command_execution','dynamic_tool','web_search'}: daily[date]['tools']+=1
                if k=='reasoning': daily[date]['reasoning_metadata']+=1
            start=stamp(p.get('startedAt')); end=stamp(p.get('completedAt'))
            if k=='run':
                runs[r['status']]+=1
                if start is not None and end is not None and end>=start: durations.append(end-start)
            if r['source']=='projection_turn_items' and start is not None and end is not None and end>=start and k in {'command_execution','dynamic_tool','web_search'}:
                tool_seconds+=end-start
                if k=='command_execution':command_seconds+=end-start
            if k in {'user_message','assistant_message'}:
                role='assistant' if k=='assistant_message' else ('agent_sent' if p.get('createdBy')=='agent' else 'user')
                roles[role]+=1; text=p.get('text','');msg_chars[role]+=len(text)
                tokens=re.findall(r"[A-Za-z][A-Za-z'-]{2,}",text.lower())
                words.update(w for w in tokens if w not in STOP)
                selected_words.update(re.findall(r'\b(?:faithful|parity|ruffle|adobe|mask|clock|geometry|test|tests|fix|bug|bugs|verify|verified|evidence|swf|random|rng|fidelity|remaining)\b',text.lower()))
                urls.update(re.findall(r'https://github\.com/ianwijma/open-bubble-tank/pull/\d+',text))
            if k=='command_execution':
                text='\n'.join(strings(p.get('input','')))
                tools['shell command']+=1;programs[command_program(text)]+=1;goals[goal(text.lower())]+=1
                command_hashes[hashlib.sha256(text.encode()).hexdigest()]+=1
                mentions.update(paths(text))
                # Conservative evidence label: named path in a read/search command.
                # Mixed shell scripts may also write it; this is not syscall tracing.
                if READ_RE.search(text):readpaths.update(paths(text))
            elif k=='dynamic_tool':
                name=p.get('toolName','unknown');tools[name]+=1
                text='\n'.join(strings(p.get('input',{})));mentions.update(paths(text))
                goals[goal((name+' '+text).lower())]+=1
                if re.search(r'(read_file|read_file|fetch_file|read_text)',name):readpaths.update(paths(text))
            elif k=='web_search':tools['web search']+=1
            if k=='file_change':
                for change in p.get('changes',[]):
                    if isinstance(change,dict):writes.update(paths(str(change.get('path',''))))
                if p.get('fileName'):writes.update(paths(p['fileName']))
        stamps=[stamp(r['payload'].get('startedAt') or r.get('updated_at')) for r in selected if r['source']=='projection_turn_items']
        stamps=[t for t in stamps if t is not None]
        if daily:
            day = datetime.fromisoformat(min(daily))
            last = datetime.fromisoformat(max(daily))
            while day <= last:
                daily[day.date().isoformat()].setdefault('records', 0)
                day += timedelta(days=1)
        buckets[scope]={'kinds':ordered(kinds),'activity_status':ordered(statuses),'tools':ordered(tools),'programs':ordered(programs),'goals':ordered(goals),'file_read_candidates':ordered(readpaths),'file_input_mentions':ordered(mentions),'file_changes':ordered(writes),'words':ordered(words),'selected_words':ordered(selected_words),'messages':dict(roles),'message_characters':dict(msg_chars),'daily':{d:dict(v) for d,v in sorted(daily.items())},'run_status':ordered(runs),'run_duration_seconds':sum(durations),'longest_run_seconds':max(durations,default=0),'tool_duration_seconds':tool_seconds,'command_duration_seconds':command_seconds,'repeated_command_executions':sum(n-1 for n in command_hashes.values()),'distinct_commands':len(command_hashes),'mentioned_pull_requests':sorted(urls,key=lambda s:int(s.rsplit('/',1)[1])),'first_activity_utc':datetime.fromtimestamp(min(stamps),tz=__import__('datetime').timezone.utc).isoformat() if stamps else None,'last_activity_utc':datetime.fromtimestamp(max(stamps),tz=__import__('datetime').timezone.utc).isoformat() if stamps else None,'usage':usage_total([r for r in selected if r['type']=='provider_usage'])}
    result['scopes']=buckets
    u=buckets['all']['usage'];t=u['totals']
    result['pricing']={'checked_date':'2026-11-15','model':'gpt-6.1-sol','currency':'USD','input_per_million':2,'cached_per_million':.1,'output_per_million':10,'cache_write_per_million':2.5,'source':'https://developers.openai.com/api/docs/pricing','model_source':'https://developers.openai.com/api/docs/models/gpt-6.1-sol','short_standard_scenario_usd':cost(t),'all_long_standard_scenario_usd':cost(t,4,.2,15,5),'uncached_counterfactual_usd':cost({**t,'uncachedInputTokens':t['inputTokens'],'cachedInputTokens':0,'cacheCreationTokens':0}),'actual_bill_usd':None,'note':'API list-price scenarios for recorded usage only, not an invoice or a bound on total thread cost. Per-request context lengths, service tiers, subscription charges, historical rates and tool fees are not reconstructed. Long-context rates apply per request; provider-turn aggregates cannot identify qualifying requests. Missing/partial usage is not imputed. Reasoning counts are already included in output. Root and child usage is summed only at main_agent scope; rolling tokenUsage context meters are excluded.'}
    return result

def table(items, limit=15):
    lines=['| Item | Count |','| --- | ---: |']
    for key,value in list(items.items())[:limit]: lines.append(f"| {str(key).replace('|', '&#124;')} | {value:,} |")
    return '\n'.join(lines)

def markdown(s):
    a=s['scopes']['all'];t=a['usage']['totals'];c=a['usage']['coverage'];p=s['pricing'];cached=t['cachedInputTokens']/t['inputTokens']*100
    return f"""# A game recreation, in numbers

Source: [Faithful Offline Game Recreation](t3-thread://v2/a713d3ff-a5f3-472b-97bd-83fd799395a5/93d9eb80-8a0a-44ac-8262-07b1ceb7992a). Frozen archive digest: `{s['archive_sha256']}`.

Open [the interactive browser report](report.html) directly from disk. It works offline without a server or third-party assets. The [complete statistics](stats.json), [archive manifest](history/manifest.json), and [readable transcript shards](history/transcript/) are included alongside it.

## Headline findings

- **{s['records']:,} archive records**, including run/usage/plan metadata; **{sum(a['kinds'][k] for k in a['kinds'] if k not in ('run','provider_usage','plan')):,} timeline items**.
- **{s['child_threads']:,} child agents / threads**; {s['threads'] - len(s['missing_threads']):,} of {s['threads']:,} discovered threads have retrievable timeline records. Discovery covers referenced children, not unrelated threads or unavailable native files.
- **{a['kinds'].get('command_execution',0):,} shell command records**, **{a['kinds'].get('dynamic_tool',0):,} dynamic tool records**, and **{a['kinds'].get('web_search',0):,} web-search records**. These are activity records, not shell subprocess or network-request counts.
- **{sum(a['messages'].values()):,} user/assistant message records**: {a['messages'].get('user',0):,} user, {a['messages'].get('agent_sent',0):,} agent-sent, {a['messages'].get('assistant',0):,} assistant. Labels use stored `createdBy`; root/all filters are in HTML.
- **{t['inputTokens']:,} input tokens**, **{t['outputTokens']:,} output tokens**; **{cached:.2f}%** of input was cached. This sums final provider-turn metadata, not words in the transcript or rolling context meters.
- **${p['short_standard_scenario_usd']:,.2f} USD** at current short-context Standard API list prices for observed usage; all-long-context Standard scenario **${p['all_long_standard_scenario_usd']:,.2f}**. Actual billing is unknown.
- {s['archive_files']:,} manifest-listed files, {s['archive_bytes']/1e6:.1f} MB on disk. No private reasoning text is included; its {a['kinds'].get('reasoning',0):,} records retain metadata only.

## Activity over time

Dates are UTC. Tool records use stored start time, falling back to update time; these timestamps can reflect import/update history rather than exact original execution time.

| UTC date | Tool records | All records |
| --- | ---: | ---: |
"""+'\n'.join(f"| {d} | {v.get('tools',0):,} | {v['records']:,} |" for d,v in a['daily'].items())+f"""

## Tool leaderboard

{table(a['tools'])}

## Named file read/search candidates

One count per named path per matching input record. Inferred from read/search syntax, including mixed shell scripts; these are **not proven filesystem reads**. Relative and checkout-specific paths are normalized. Full input-mention and file-change lists are separate in `stats.json`.

{table(a['file_read_candidates'])}

## Words in user and assistant messages

Case-insensitive English-shaped words of at least three characters; common stop words are removed. Tool outputs, commands, reasoning and metadata do not contribute. Repeated quoted/handoff messages remain and can repeat words.

{table(a['words'])}

Selected words, with no stop-word filtering:

{table(a['selected_words'],40)}

## Command goals and failures

Goal labels are heuristic, mutually exclusive categories; validation wins before GitHub, reference work, read/search and edits. A command can contain several operations. Failure status is an execution outcome, not a count of software bugs.

{table(a['goals'])}

Timeline statuses:

{table(a['activity_status'])}

There were {a['repeated_command_executions']:,} repeat executions of identical command input strings, beyond their first occurrences. Summed tool durations are {a['tool_duration_seconds']/3600:,.1f} hours and summed completed run intervals are {a['run_duration_seconds']/3600:,.1f} hours. Both can overlap and include waiting; neither measures human effort or unique elapsed runtime. {len(a['mentioned_pull_requests'])} distinct project PR URLs were mentioned in messages; mentions do not prove creation or merge.

## Token accounting and price assumptions

{table(t,20)}

Provider-turn coverage: {c.get('complete',0)} complete, {c.get('partial',0)} partial, {c.get('missing',0)} missing out of {c.get('provider_turns',0)} turns. Partial counters contribute their available values; missing counters contribute nothing. Only `main_agent` scoped `turnTokenUsage` is summed independently across root and child threads. `reasoningTokens` is a subset of output and is not added again. Input includes cached input; cached tokens are not added again either. Models are joined to recorded run selection where possible; unattributed native turns are shown explicitly in `stats.json`.

Current {p['checked_date']} [OpenAI pricing]({p['source']}) and [model conditions]({p['model_source']}) provide USD per million token rates of $2 input, $0.10 cached input, $2.50 cache writes and $10 output. Formula: `(uncached × 2 + cached × 0.1 + writes × 2.5 + output × 10) / 1,000,000`.

The all-long scenario uses $4/$0.20/$5/$15 respectively. The model page applies those rates above 272K input tokens per request and states that subscription usage has no long-context surcharge. Provider-turn totals aggregate requests, so this archive cannot identify the surcharge mix. Service tier, historical prices, actual subscription/API charges, discounts and paid tool fees are not reconstructed. These scenarios are neither invoices nor lower/upper bounds on the complete thread bill. The no-cache counterfactual at short Standard rates is ${p['uncached_counterfactual_usd']:,.2f}; it assumes identical input and output volume and is not measured savings.

## Coverage, exclusions and reproduction

The exporter reads one read-only SQLite snapshot and follows recorded child references recursively. It exports current projections, not an append-only event log; intermediate streaming revisions, deleted/unrecorded content, native assets and missing attachments cannot be recovered. User/assistant transcripts contain stored text; attachment/context counts preserve metadata without claiming those bodies were exported. Provider final usage was added in the same transaction. The report describes this frozen game thread, not the cost/activity of producing this report.

Private reasoning, compaction/internal prompts and secret-request payloads are omitted. Credential-like values and binary payloads are scrubbed with explicit markers; per-kind counts are in the manifest. Unknown payload keys are excluded by allowlist. No claim of byte-for-byte original recovery is made.

```sh
# Requires the local T3 SQLite database only when refreshing the archive:
python3 tools/thread-report/export_history.py
# Rebuild solely from the checked-in archive, validating all hashes and row counts:
python3 tools/thread-report/analyze.py
python3 -m unittest discover -s tools/thread-report -p 'test_*.py'
```

The report does not reassess game completion or change the fixed fidelity checkpoints in `docs/completion-checklist.md`.
"""

def write_reports(stats, output):
    output.mkdir(parents=True,exist_ok=True)
    (output/'stats.json').write_text(json.dumps(stats,indent=2,ensure_ascii=False)+'\n', encoding='utf-8')
    (output/'report.md').write_text(markdown(stats), encoding='utf-8')
    template=(Path(__file__).parent/'report-template.html').read_text(encoding='utf-8')
    # Escape '<' so archive-controlled labels cannot end the script element.
    payload=json.dumps(stats,ensure_ascii=False,separators=(',',':')).replace('<','\\u003c').replace('\u2028','\\u2028').replace('\u2029','\\u2029')
    (output/'report.html').write_text(template.replace('__REPORT_DATA__',payload), encoding='utf-8')

def main():
    ap=argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--history',type=Path,default=ROOT/'docs/thread-report/history')
    ap.add_argument('--output',type=Path,default=ROOT/'docs/thread-report')
    args=ap.parse_args();m,rows=load_rows(args.history);s=analyze(m,rows);write_reports(s,args.output)
    print(json.dumps({k:s[k] for k in ['records','threads','archive_sha256']}))
if __name__=='__main__': main()
