/** The base movie has no part that calls SetLocking. A future parts pack owns this controller. */
export interface TargetLockHooks {
  cycle(): void;
  clear(capacity?: number): void;
}

export const disabledTargetLocks: TargetLockHooks = Object.freeze({
  cycle() {},
  clear() {},
});
