import fixture from './world-layer.json';
/** Builtin ByteArray words, not generated decimal expectations. */
export function worldLayerNumber(phase: string, age: number, role: string, key: string) {
  const row = fixture.samples.find((s) => s.phase === phase && s.age === age && s.role === role)!;
  const words = row.words[fixture.fields.indexOf(key)];
  const bytes = new DataView(new ArrayBuffer(8));
  bytes.setUint32(0, words[0]);
  bytes.setUint32(4, words[1]);
  return bytes.getFloat64(0);
}
