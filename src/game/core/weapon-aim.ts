/** Weapon.Setup followed by PartCallAcquireTarget/SeperatePartSetup overrides in _-ct. */
const fixedAvatar = new Set([
  3001, 3002, 3003, 3004, 3006, 3007, 3008, 3010, 3011, 3012, 3013, 3016, 3017, 5003, 5004, 5005,
  5006,
]);
/** Constructor blnRotate assignments, including Healer's true override of Aggressor. */
const fixedNpc = new Set([
  4002, 4003, 4008, 4009, 4010, 4012, 4013, 4021, 4022, 4026, 6001, 6003, 6005,
]);
export const weaponAimFlags = (id: number, classId: number) => ({
  avatar: classId > 3 && !fixedAvatar.has(id),
  rotates: !fixedNpc.has(id),
});
