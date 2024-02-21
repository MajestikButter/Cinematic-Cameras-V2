import { Player, system, world } from "@minecraft/server";
import { cinematics, editors } from "./loaded";
import { CinematicPlayer } from "./classes/Player";

export async function itemUse(source: Player, itemId: string) {
  let editor = editors[source.id];
  if (!editor) {
    const plr = new CinematicPlayer(source);
    if (itemId == "mbcc:close") {
      for (let i = 0; i < 9; i++) plr.setItem(i);
    }
    return;
  }
  switch (itemId) {
    case "mbcc:play": {
      editor.play();
      break;
    }
    case "mbcc:stop": {
      editor.stop();
      break;
    }
    case "mbcc:move_left": {
      editor.moveCursor(-1);
      break;
    }
    case "mbcc:move_right": {
      editor.moveCursor(1);
      break;
    }
    case "mbcc:new_keyframe": {
      editor.newKeyframe();
      break;
    }
    case "mbcc:edit_keyframe": {
      editor.editKeyframe();
      break;
    }
    case "mbcc:delete_keyframe": {
      editor.deleteKeyframe();
      break;
    }
    case "mbcc:close": {
      editor.stopHotbar();
      delete editors[source.id];
      break;
    }
    case "mbcc:settings": {
      await editor.editSettings();
      let cin = editor.cinematic;
      cinematics[cin.id] = cin;
      break;
    }
  }
}

world.beforeEvents.itemUse.subscribe(async (ev) => {
  const { source, itemStack } = ev;
  if (!(source instanceof Player)) return;
  system.run(() => itemUse(source, itemStack.typeId));
});
