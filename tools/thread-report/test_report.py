"""Accounting and export-boundary regressions with synthetic records (no real secrets)."""
import gzip
import hashlib
import json
from pathlib import Path
import tempfile
import unittest

from analyze import cost, load_rows, usage_total, validate_coverage
from export_history import Stats, match_run, sanitize_item, scrub_value

class AccountingTests(unittest.TestCase):
    def test_run_id_join_uses_complete_identity(self):
        runs = [{'id':'run:thread:example:ordinal:1'}, {'id':'run:thread:example:ordinal:11'}]
        selected = match_run(runs, 'other-node', 'run-attempt:run:run%3Athread%3Aexample%3Aordinal%3A11:attempt:1')
        self.assertEqual(selected['id'], runs[1]['id'])

    def row(self, item='one', scope='main_agent', **usage):
        return {'thread_id':'root','item_id':item,'payload':{'model':'test','usage':{'usageScope':scope,'usageStatus':'complete','inputTokens':100,'cachedInputTokens':80,'cacheCreationTokens':0,'outputTokens':10,'reasoningTokens':6,**usage}}}

    def test_cached_and_reasoning_are_subsets(self):
        result=usage_total([self.row()]);t=result['totals']
        self.assertEqual(t['inputPlusOutputTokens'],110)
        self.assertEqual(t['uncachedInputTokens'],20)
        self.assertAlmostEqual(cost(t,2,1,10,3),220/1e6)

    def test_aggregate_agent_scope_is_excluded(self):
        result=usage_total([self.row(),self.row('aggregate',scope='all_agents',inputTokens=999)])
        self.assertEqual(result['totals']['inputTokens'],100)
        self.assertEqual(result['coverage']['excluded_ambiguous_scope'],1)

    def test_missing_partial_and_duplicate_usage(self):
        partial=self.row(usageStatus='partial');missing={'thread_id':'child','item_id':'none','payload':{}}
        result=usage_total([partial,missing])
        self.assertEqual(result['coverage'],{'provider_turns':2,'partial':1,'missing':1})
        with self.assertRaises(ValueError):usage_total([partial,partial])

    def test_impossible_cache_count_rejects(self):
        with self.assertRaises(ValueError):usage_total([self.row(cachedInputTokens=101)])

    def test_usage_model_recovers_missing_run_attribution(self):
        row = self.row(models=['reported-model'])
        row['payload']['model'] = None
        self.assertEqual(usage_total([row])['model_turns'], {'reported-model': 1})

    def test_metadata_only_thread_is_not_timeline_coverage(self):
        rows = [{'thread_id': 'metadata-only', 'type': 'run', 'source': 'projection_runs'}]
        manifest = {'counts': {'threads': 1, 'by_type': {'run': 1}}, 'coverage': {'threads': [{'thread_id': 'metadata-only', 'records': 1, 'retrievable': False}], 'missing_threads': ['metadata-only']}}
        validate_coverage(manifest, rows)
        manifest['coverage']['threads'][0]['retrievable'] = True
        with self.assertRaisesRegex(ValueError, 'timeline coverage mismatch'):
            validate_coverage(manifest, rows)

    def test_manifest_detects_tampering(self):
        with tempfile.TemporaryDirectory() as folder:
            base=Path(folder);p=base/'one.jsonl.gz';p.write_bytes(gzip.compress(b'{}\n',mtime=0))
            f={'path':p.name,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'format':'jsonl.gz','records':1}
            digest=hashlib.sha256(f"{f['path']}\0{f['sha256']}\n".encode()).hexdigest()
            (base/'manifest.json').write_text(json.dumps({'files':[f],'archive_sha256':digest,'counts':{'records':1}}))
            p.write_bytes(b'tampered')
            with self.assertRaisesRegex(ValueError,'file hash mismatch'):load_rows(base)

class ExportBoundaryTests(unittest.TestCase):
    def test_reasoning_record_never_has_content(self):
        clean,_,_,_=sanitize_item('reasoning','completed',{'title':'private-title','text':'private-body'},Stats())
        self.assertEqual(clean,{'content_omitted':True})

    def test_nested_json_tool_results_scrub_private_records(self):
        text=json.dumps({'items':[{'type':'reasoning','text':'private-body'},{'type':'assistant_message','text':'public-body'}]})
        result=json.loads(scrub_value(text,Stats(),[0]))
        self.assertNotIn('private-body',json.dumps(result))
        self.assertIn('public-body',json.dumps(result))

    def test_binary_payload_is_metadata_only(self):
        result=scrub_value({'type':'image','data':'SYNTHETIC_BINARY_CONTENT'},Stats(),[0])
        self.assertNotIn('data',result)
        self.assertEqual(result['encoded_bytes'],24)
        self.assertTrue(result['content_omitted'])

    def test_secret_tool_payload_is_omitted(self):
        clean,_,_,_=sanitize_item('dynamic_tool','completed',{'toolName':'request_secret','input':{'value':'synthetic-sensitive-body'},'output':'synthetic-secret-response'},Stats())
        self.assertNotIn('input',clean);self.assertNotIn('output',clean)
        self.assertTrue(clean['content_omitted'])

if __name__=='__main__':unittest.main()
