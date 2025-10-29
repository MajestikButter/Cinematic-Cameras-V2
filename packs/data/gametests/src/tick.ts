import { EquipmentSlot, Player, system, world } from "@minecraft/server";

import { CinematicPlayer } from "./classes/Player";
import { cinematics, editors } from "./loaded";
import { itemUse } from "./items";
import { Editor } from "./classes/Editor";

const lastSave: { [k: string]: number } = {};
let prevRun = new Date().getTime();

world.afterEvents.playerLeave.subscribe(
  ({ playerId }) => delete lastSave[playerId],
);

function tickEditor(p: Player, editor: Editor, time: number) {
  const unsaved = time - (lastSave[p.id] ?? 0) >= 30000;
  if (unsaved) {
    editor.cinematic.save("_autosave");
    lastSave[p.id] = time;
  }

  editor.tick();
  if (!p.isSneaking) return;

  const equip = p.getComponent("equippable");
  const held = equip?.getEquipment(EquipmentSlot.Mainhand);
  if (held && held.typeId.startsWith("mbcc:move_")) {
    itemUse(p, held.typeId);
  }
}

world.afterEvents.worldLoad.subscribe(() => {
  system.runInterval(() => {
    const time = new Date().getTime();
    const delta = (time - prevRun) / 1000;
    prevRun = time;

    for (let p of world.getAllPlayers()) {
      const editor = editors[p.id];
      if (editor) tickEditor(p, editor, time);

      let plr = new CinematicPlayer(p);
      let id = plr.getProp("cinematicId");
      // console.warn(id);
      if (!id) continue;
      let cin = cinematics[id];
      if (!cin) continue;
      cin.tick(plr, delta);
    }
  }, 1);
});
