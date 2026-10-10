// Port of DofusDataProviderSymbol.as (`_global.DofusDataProviderClass`): the sparse list + key set behind
// DATACENTER.Characters, Player.Spells, Player.SpellsUsed, … Views are UI list components (modelChanged).
//
// AS quirk kept (it shapes game state): only object values (and null) replace an entry. The client "removes"
// characters with `setItemAt(id, undefined)` (Client.Game.as:262, CharactersManager.as:14), which instead sets
// `label = undefined` on the existing object (or creates a `{label}` placeholder past the end), and never
// deletes `keys[id]`. So removed characters stay in `items` and in `keys` (BattleField.Map.calculateTacleZone
// iterates `keys`).

/** Members the provider writes onto stored objects. */
type Meta = { index?: unknown; __ID__?: unknown; label?: unknown };
export interface DataProviderView {
  modelChanged(event: { event: string; firstRow?: number; lastRow?: number }): void;
}
type Value<T> = T | null | string | number | undefined;

export class DofusDataProvider<T extends object> {
  items: (T | null | undefined)[] = [];
  keys: Record<string, null> = {};
  uniqueID = 0;
  views: DataProviderView[] = [];

  /** Lines 13-18 */
  addView(viewRef: DataProviderView): void {
    this.views.push(viewRef);
    viewRef.modelChanged({ event: "updateAll" });
  }

  /** Lines 19-42 */
  addItemAt(index: number, value: Value<T>): void {
    this.keys[index] = null;
    if (index < this.getLength()) this.items.splice(index, 0, undefined);
    this.items[index] = this.wrap(value, {});
    const row = this.items[index];
    const id = this.uniqueID++; // incremented even when the stored value is null (SetMember on null is a no-op)
    if (row) {
      (row as Meta).index = index;
      (row as Meta).__ID__ = id;
    }
    this.updateViews({ event: "addRows", firstRow: index, lastRow: index });
  }

  /** Lines 43-46 */
  addItem(value: Value<T>): void {
    this.addItemAt(this.getLength(), value);
  }

  /** Lines 47-57 */
  removeItemAt(index: number): T | null | undefined {
    delete this.keys[index];
    const item = this.items[index];
    this.items.splice(index, 1);
    this.updateViews({ event: "deleteRows", firstRow: index, lastRow: index });
    return item;
  }

  /** Lines 58-64 (lastRow is computed after clearing: -1, as in the AS). */
  removeAll(): void {
    this.keys = {};
    this.items = [];
    this.updateViews({ event: "deleteRows", firstRow: 0, lastRow: this.getLength() - 1 });
  }

  /** Lines 65-85 */
  replaceItemAt(index: number, itemObj: Value<T>): void {
    if (index < 0 || index >= this.getLength()) return;
    this.keys[index] = null;
    const id = this.getItemID(index);
    this.items[index] = this.wrap(itemObj, this.items[index]);
    const row = this.items[index];
    if (row) (row as Meta).__ID__ = id;
    this.updateViews({ event: "updateRows", firstRow: index, lastRow: index });
  }

  /** Lines 86-98 */
  setItemAt(index: number, itemObj: Value<T>): void {
    if (index >= 0) {
      if (index >= this.getLength()) return this.addItemAt(index, itemObj);
      this.replaceItemAt(index, itemObj);
    }
  }

  /** Lines 99-103 */
  deleteItemAt(index: number): void {
    delete this.keys[index];
    this.items[index] = undefined;
  }

  getLength(): number {
    return this.items.length;
  }

  /** Lines 108-122 */
  getItemIndex(value: unknown, param: string): number[] {
    const out: number[] = [];
    this.items.forEach((item, i) => {
      if (item && (item as Record<string, unknown>)[param] == value) out.push(i);
    });
    return out;
  }

  getItemAt(index: number | string): T | undefined {
    return this.items[Number(index)] ?? undefined;
  }

  getItemID(index: number): number | undefined {
    return (this.items[index] as Meta | null | undefined)?.__ID__ as number | undefined;
  }

  /** Lines 131-140 — Array.sortOn(fieldName): ponytail: plain string compare; AVM1 sortOn edge cases (undefined, case) not reproduced. */
  sortItemsBy(fieldName: string, order?: string): void {
    const key = (r: T | null | undefined): string => String((r as Record<string, unknown> | null | undefined)?.[fieldName]);
    this.items.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
    if (order == "DESC") this.items.reverse();
    this.updateViews({ event: "sort" });
  }

  /** Lines 141-150 — overwrites indexTo (its old item is lost) and nulls indexFrom. */
  moveItem(indexFrom: number, indexTo: number): void {
    const item = this.items[indexFrom];
    this.items[indexFrom] = null;
    this.items[indexTo] = item;
  }

  updateViews(eventObj: { event: string; firstRow?: number; lastRow?: number }): void {
    for (const v of this.views) v.modelChanged(eventObj);
  }

  /** `typeof v == "object"` → store it (null included); otherwise set `label` on the existing/new object. */
  private wrap(v: Value<T>, existing: T | null | undefined | object): T | null | undefined {
    if (v === null || typeof v == "object") return v as T | null;
    // ponytail: placeholder `{label}` objects are typed as rows; they are not real T (AS quirk, see header).
    if (existing) (existing as Meta).label = v;
    return existing as T | null | undefined;
  }
}
