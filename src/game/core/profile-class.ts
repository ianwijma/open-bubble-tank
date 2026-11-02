/** PlayerProfile.maxClass: session value written on upgrade, untouched on downgrade/reset-world. */
export class ProfileClassAllowance {
  value = 1;
  recordUpgrade(level: number) {
    this.value = Math.min(6, level + 1);
  }
}
