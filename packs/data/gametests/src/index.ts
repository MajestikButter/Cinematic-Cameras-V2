import {
  Player,
  system,
  world,
  EntityInventoryComponent,
} from '@minecraft/server';

import { Cinematic } from './classes/Cinematic';
import stored from './cinematics';
import { CinematicPlayer } from './classes/Player';
import { Editor } from './classes/Editor';

const editors: Map<Player, Editor> = new Map();

const cinematics: {
  [id: string]: Cinematic;
} = {};

for (let k in stored) {
  let obj = stored[k];
  cinematics[k] = Cinematic.fromJSON(k, obj);
}

world.events.beforeChat.subscribe((evd) => {
  let { sender, message } = evd;
  if (!message.startsWith('!')) return;
  evd.cancel = true;
  let args = message.split(' ');
  let cmd = args[0].slice(1);
  switch (cmd) {
    case 'new': {
      let id = args[1];
      if (!id)
        return sender.tell(`§cSupply an id in order to create a cinematic§r`);
      let cin = cinematics[id];
      if (cin) return sender.tell(`§cFound existing cinematic: ${id}§r`);
      cinematics[id] = new Cinematic(id);
      sender.tell(`§aSuccessfully created cinematic: ${id}§r`);
      break;
    }
    case 'edit': {
      let id = args[1];
      let cin = cinematics[id];
      if (!cin) return sender.tell(`§cFailed to find cinematic: ${id}§r`);
      editors.set(sender, new Editor(new CinematicPlayer(sender), cin));
      sender.tell(`§aSuccessfully started editing: ${id}§r`);
      break;
    }
    case 'play': {
      let id = args[1];
      let cin = cinematics[id];
      if (!cin) return sender.tell(`§cFailed to find cinematic: ${id}§r`);

      let startStr = args[2];
      let startNum: number | undefined;
      if (startStr) startNum = parseFloat(startStr);
      let speedStr = args[3];
      let speedNum: number | undefined;
      if (speedStr) speedNum = parseFloat(speedStr);
      cin.play(
        new CinematicPlayer(sender),
        startNum && !isNaN(startNum) ? startNum : 0,
        speedNum && !isNaN(speedNum) ? speedNum : 1
      );
      sender.tell(
        `§aSuccessfully started: ${id} start: ${startNum} speed: ${speedNum}§r`
      );
      break;
    }
    case 'stop': {
      let plr = new CinematicPlayer(sender);
      let id = plr.getProp('cinematicId');
      if (!id) return sender.tell(`§cNo cinematic is currently playing§r`);
      let cin = cinematics[id];
      if (!cin) return sender.tell(`§cFailed to find cinematic: ${id}§r`);
      cin.stop(plr);
      sender.tell(`§aSuccessfully stopped: ${id}§r`);
      break;
    }
    case 'visualize': {
      let id = args[1];
      let cin = cinematics[id];
      if (!cin) return sender.tell(`§cFailed to find cinematic: ${id}§r`);
      let startStr = args[2];
      let startNum: number | undefined;
      if (startStr) startNum = parseFloat(startStr);
      let speedStr = args[3];
      let speedNum: number | undefined;
      if (speedStr) speedNum = parseFloat(speedStr);
      let particle = args[4];
      cin.visualize(
        startNum && !isNaN(startNum) ? startNum : 0,
        speedNum && !isNaN(speedNum) ? speedNum : 1,
        particle
      );
      sender.tell(
        `§aSuccessfully visualizing: ${id} start: ${startNum} speed: ${speedNum}§r`
      );
      break;
    }
    case 'export': {
      let id = args[1];
      let cin = cinematics[id];
      if (!cin) return sender.tell(`§cFailed to find cinematic: ${id}§r`);
      let res = JSON.stringify(cin.toJSON());
      let plr = new CinematicPlayer(sender);
      cin.promptCopy(plr, res);
      sender.tell(`§aSuccessfully exported: ${id}§r`);
      break;
    }
    case 'bake': {
      let id = args[1];
      let cin = cinematics[id];
      if (!cin) return sender.tell(`§cFailed to find cinematic: ${id}§r`);
      let speedStr = args[2];
      let speedNum: number | undefined;
      if (speedStr) speedNum = parseFloat(speedStr);

      if (!speedNum || isNaN(speedNum)) speedNum = 1;
      speedNum /= 20;

      let res = '';
      for (let i = 0; i * speedNum < cin.timeline.length; i++) {
        let time = i * speedNum;
        const { pos, rot } = cin.transformFromTime(time);
        res += `execute if score @s frame matches ${i} run tp ${pos.x.toFixed(
          3
        )} ${pos.y.toFixed(3)} ${pos.z.toFixed(3)} ${rot.y.toFixed(
          3
        )} ${rot.x.toFixed(3)}\n`;
      }
      let plr = new CinematicPlayer(sender);
      cin.promptCopy(plr, res);
      sender.tell(`§aSuccessfully baked: ${id}§r`);
      break;
    }
    default: {
      sender.tell(`§cNo command found: ${cmd}§r`);
    }
  }
});

// world.events.worldInitialize.subscribe(({ propertyRegistry: reg }) => {
//   const def = new DynamicPropertiesDefinition();
//   def.defineNumber('cinematicSpeed');
//   def.defineNumber('cinematicTime');
//   def.defineNumber('cinematicMode');
//   def.defineString('cinematicId', 32);
//   reg.registerEntityTypeDynamicProperties(def, MinecraftEntityTypes.player);
// });

function clearItem(player: Player, slot: number) {
  player.runCommandAsync(`replaceitem entity @s slot.hotbar ${slot} air`);
}

async function itemUse(source: Player, itemId: string) {
  let editor = editors.get(source);
  if (!editor) {
    if (itemId == 'mbcc:close') {
      for (let i = 0; i < 9; i++) clearItem(source, i);
    }
    return;
  }
  switch (itemId) {
    case 'mbcc:play': {
      editor.play();
      break;
    }
    case 'mbcc:stop': {
      editor.stop();
      break;
    }
    case 'mbcc:move_left': {
      editor.moveCursor(-1);
      break;
    }
    case 'mbcc:move_right': {
      editor.moveCursor(1);
      break;
    }
    case 'mbcc:new_keyframe': {
      editor.newKeyframe();
      break;
    }
    case 'mbcc:edit_keyframe': {
      editor.editKeyframe();
      break;
    }
    case 'mbcc:delete_keyframe': {
      editor.deleteKeyframe();
      break;
    }
    case 'mbcc:close': {
      editor.stopHotbar();
      editors.delete(source);
      break;
    }
    case 'mbcc:settings': {
      await editor.editSettings();
      let cin = editor.cinematic;
      cinematics[cin.id] = cin;
      break;
    }
  }
}

world.events.itemUse.subscribe(async ({ source, item }) => {
  if (!(source instanceof Player)) return;
  itemUse(source, item.typeId);
});

let prevRun = new Date().getTime();
system.run(function tick() {
  system.run(tick);

  let time = new Date().getTime();
  let delta = (time - prevRun) / 1000;
  prevRun = time;

  for (let p of world.getAllPlayers()) {
    let editor = editors.get(p);
    if (editor) {
      editor.tick();
      if (p.isSneaking) {
        let inv = p.getComponent('inventory') as EntityInventoryComponent;
        let held = inv.container.getItem(p.selectedSlot);
        if (held && held.typeId.startsWith('mbcc:move_')) {
          itemUse(p, held.typeId);
        }
      }
    }

    let plr = new CinematicPlayer(p);
    let id = plr.getProp('cinematicId');
    if (!id) continue;
    let cin = cinematics[id];
    if (!cin) continue;
    cin.tick(plr, delta);
  }
});
