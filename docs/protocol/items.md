# Items (`O` family)

Conventions: see [account.md](account.md) header. Client: `AKSClient/Dofus.Client.Items.as`, callbacks
`AKSClient/Events.AKS.Items.as`, dispatch `AKSClient/Dofus.Client.DataProcessor.as:442-455`.

**Number bases differ per message:** item fields inside an item entry are **hex**; the ids the client sends in
`OM`/`OD` are **decimal** (`m_ID` is the parsed number, stringified in base 10); the id in `ODK` is parsed as
**decimal** (`Number()`).

---

## Item entry format

Used in `AS` part 30 (joined by `;`), `OAK` (`O` award, joined by `;`) and `GA` type 10 (`O` award, single entry).

```
<idHex>~<typeHex>~<gfxHex>~<RRGGBB>~<positionHex>~<effects>
<effects> = <effect>,<effect>,…
<effect>  = <typeHex>                         (no description)
          | <typeHex>#<p1Hex>#<p2Hex>#<p3Hex> (with description; "0" = parameter absent)
```
Parsed by `KERNEL.CharactersManager.getItemObjectFromData` (`AKSClient/Dofus.CharactersManager.as:176-194`) and
`Class_DataCenter_Item.prototype.setEffects` (`AKSClient/Dofus.DataCenter.Item.as:12-37`). An empty entry string
yields no item (`AKSClient/Dofus.CharactersManager.as:180`).

| Field | Decoding | Use |
|---|---|---|
| `id` | `parseInt(hex)` → `m_ID` | identity in inventory, sent back (decimal) in `OM`/`OD` |
| `type` | `parseInt(hex)` → `m_Type` | lang `I.t[type]` (name, super-type `t`, gender `g`, singular `s`) (`AKSClient/Dofus.DataCenter.Item.as:48-68`, `AKSClient/Dofus.Kernel.Init.as:129-137`); icon `clips/items/<type>/<gfx>.swf` (`AKSClient/Dofus.DataCenter.Item.as:38-47`) |
| `gfx` | `parseInt(hex)` → `m_Gfx` | icon file |
| `RRGGBB` | 3 × `parseInt(2 hex)` → `m_ColorRed/Green/Blue` | colour transform with offset 20 (`AKSClient/Dofus.DataCenter.Item.as:131-146`) |
| `position` | empty → `-1` (in bag), else `parseInt(hex)` | equipment slot 0..5 (`modules_Interfaces/__Packages/dofus/graphics/gui/common/InventoryViewer.as:53-55`; slot ids in `modules_Interfaces/DefineSprite_598_InventoryViewer/frame_1/PlaceObject2_568_EquipementItemContainer_*/CLIPACTIONRECORD on(initialize).as:3`) |
| effect `type` | `parseInt(hex)` | lang `I.e[type]`: `n` = name suffix combined with `ank.PatternDecoder.combine`, `d` = description template filled by `PatternDecoder.getDescription` with `p1..p3` (`AKSClient/Dofus.DataCenter.Item.as:69-106`); see [encodings.md](encodings.md#patterndecoder-lang-templates) |
| `p1..p3` | `"0"` → undefined, else `parseInt(hex)` | template parameters `#1..#3` |

Quirks: `setEffects("")` still pushes one effect with type NaN, so `m_Effects.length` is never 0 and the `0.swf`
fallback icon is unreachable (`AKSClient/Dofus.DataCenter.Item.as:15,41-44`). `canEquip` for super-type 2 (weapons) checks the class weapon
list `getGuildText(guild).w` (`AKSClient/Dofus.DataCenter.Item.as:107-130`).

Example: `1a~5~3~FF8800~~64#a#0#0` → id 26, type 5, gfx 3, orange, in bag, effect 0x64 with `#1 = 10`.

---

## OM — move (equip) an item (C→S)

```
OM<itemIdDecimal>|<position>\n\0
```
`AKSClient/Dofus.Client.Items.as:10-13` (no spinner). Trigger: dropping an item on an equipment slot → `onEquipItem(itemData,
positionID)` (`modules_Interfaces/__Packages/dofus/graphics/gui/common/InventoryViewer.as:149-153`,
`modules_Interfaces/__Packages/dofus/graphics/gui/common/EquipementItemContainer.as:165`). `position` = slot 0..5. Un-equipping: dragging an item off its slot and releasing it anywhere but a slot or the drop
zone sends `OM<id>|-1` (`EquipementItemContainer.as:146` → `InventoryViewer.onTestMouse`, `InventoryViewer.as:200-223`).
The item a slot held when another one is dropped on it goes back to the bag client-side only, nothing sent
(`onReplaceItem`, `modules_Interfaces/__Packages/dofus/graphics/gui/common/InventoryViewer.as:154-157`). No answer is expected.

## OD — drop an item (C→S, S→C)

C→S `OD<itemIdDecimal>\n\0` (`AKSClient/Dofus.Client.Items.as:14-17`, no spinner), after a yes/no box `DO_U_DROP`
(`modules_Interfaces/__Packages/dofus/graphics/gui/common/InventoryViewer.as:158-167`).

S→C:
```
ODK<itemIdDecimal>\0     → DATACENTER.Player.dropItem(Number(id)) removes the first item with that m_ID
ODE…\0                   → message box DROP_FULL
```
`AKSClient/Dofus.Client.DataProcessor.as:450-451` → `innerOnDrop(error, substr(3))` (`AKSClient/Dofus.Client.Items.as:81-84`) → `AKSClient/Events.AKS.Items.as:14-24`,
`AKSClient/Dofus.DataCenter.Player.as:81-97`. Example: `ODK26\0`.

---

## OA — items/gold awarded (S→C)

```
OAK<award>*<award>*…\0
OAEF\0     inventory full     → INVENTORY_FULL
OAEL\0     level too low      → TOO_LOW_LEVEL_FOR_ITEM
<award> = G<amount>                      gold → message box YOU_FIND_GOLD [amount]
        | O<itemEntry>;<itemEntry>;…     items → Player.addItem + message box per item
        | <anything else>                → message box YOU_FIND_SOMTHING
```
`AKSClient/Dofus.Client.DataProcessor.as:453-454` → `innerOnAdd(error, substr(3))` (`AKSClient/Dofus.Client.Items.as:27-80`, `AKSClient/Events.AKS.Items.as:1-8`).
Error code = the whole `substr(3)` compared to `F`/`L`. Gold is only displayed; the player's `GP` is not updated
(use `AB` with stat 2). Quirk: the inner loop reuses the global `i` of the outer loop
(`AKSClient/Dofus.Client.Items.as:48-77` declares `var i` again), so an `O` award with several items can end the outer loop early —
send one award per `OA` frame when it contains items **[inference from the code]**.

Example: `OAKG150\0`, `OAKO1a~5~3~FF8800~~64#a#0#0\0`.

---

## OW — weapon change of a character (S→C)

```
OW<characterId>|<weaponTypeHex>|<gfxHex>|<colour>\0
```
`AKSClient/Dofus.Client.DataProcessor.as:447-448` → `innerOnWeapon(substr(2))` (`AKSClient/Dofus.Client.Items.as:18-26`) → sets
`character.weapon.gfx = <type>_<gfx>` (both converted to decimal) (`AKSClient/Events.AKS.Items.as:9-13`): the weapon clip
linkage name used next time the sprite applies its weapon (`AKSClient/Dofus.CharactersWeapons.as:26-50`).
`colour` is **read but unused**. Example: `OW12|2|5|FFFFFF\0` → `weapon.gfx = "2_5"`.

## OF (S→C)

`OF…` is matched and ignored (`AKSClient/Dofus.Client.DataProcessor.as:445-446`). Purpose **UNKNOWN — not in code**.
