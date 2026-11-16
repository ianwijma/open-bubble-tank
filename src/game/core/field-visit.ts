import type { Field } from './types';

/** The visit belongs to a live Bubblefield wrapper, never its cached enemy list. */
export class FieldVisit {
  completed = false;
  constructor(public starting = false) {}

  canComplete(field: Field) {
    return !this.starting && !this.completed && !field.destroyed && field.enemies.length === 0;
  }

  tryComplete(field: Field) {
    if (!this.canComplete(field)) return false;
    this.completed = true;
    return true;
  }
}
