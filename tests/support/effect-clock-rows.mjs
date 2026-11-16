/** Pure decoders for the frozen effect clock contract in tests/fixtures. Moved from the removed
 * capture tooling; reads no original file. */
export function decode(words) {
  const b = Buffer.alloc(8);
  const result = [];
  for (let i = 0; i < words.length; i += 2) {
    b.writeUInt32BE(words[i], 0);
    b.writeUInt32BE(words[i + 1], 4);
    result.push(b.readDoubleBE());
  }
  return result;
}
/** @returns {string[]} */
export function unpack(contract) {
  return contract.records.map((record) => {
    const r = record.split(',').map(Number);
    return r.length === 17 && contract.strings[r[0]] === 'BT3_EFFECT_BITS'
      ? [
          ...r.slice(0, 16).map((i) => contract.strings[i]),
          ...contract.poses[r[16]].match(/.{8}/g).map((w) => parseInt(w, 16)),
        ].join(' ')
      : r.map((i) => contract.strings[i]).join(' ');
  });
}
/** @typedef {{tick:number,phase:string,label:string,path:string,kind:string,id:number,className:string,parentId:number,parentNull:boolean,parentTop:boolean,name:string,frame:number,total:number,isPlaying:string,children:number,words:number[]}} EffectClockRow */
/** @returns {EffectClockRow[]} */
export function rows(contract) {
  return unpack(contract)
    .filter((s) => s.startsWith('BT3_EFFECT_BITS '))
    .map((s) => {
      const t = s.split(' ');
      return {
        tick: +t[1],
        phase: t[2],
        label: t[3],
        path: t[4],
        kind: t[5],
        id: +t[6],
        className: t[7],
        parentId: +t[8],
        parentNull: t[9] === 'true',
        parentTop: t[10] === 'true',
        name: t[11],
        frame: +t[12],
        total: +t[13],
        isPlaying: t[14],
        children: +t[15],
        words: t.slice(16).map(Number),
      };
    });
}
