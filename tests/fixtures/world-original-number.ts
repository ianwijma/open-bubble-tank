import original from './world-layer-original.json';
/** Original builtin ByteArray words, not native-generated decimal expectations. */
export function worldOriginalNumber(phase: string, age: number, role: string, key: string) {
  const row = original.samples.find((s) => s.phase === phase && s.age === age && s.role === role)!;
  const words = row.words[original.fields.indexOf(key)];
  const bytes = new DataView(new ArrayBuffer(8));
  bytes.setUint32(0, words[0]);
  bytes.setUint32(4, words[1]);
  return bytes.getFloat64(0);
}
