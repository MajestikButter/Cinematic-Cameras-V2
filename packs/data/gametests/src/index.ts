import {
  Player,
  system,
  world,
  EntityInventoryComponent,
  DynamicPropertiesDefinition,
} from '@minecraft/server';

import { Cinematic } from './classes/Cinematic';
import stored from './cinematics';
import { CinematicPlayer } from './classes/Player';
import { Editor } from './classes/Editor';
import { Keyframe } from './classes/Keyframe';

const editors: Map<Player, Editor> = new Map();

const cinematics: {
  [id: string]: Cinematic;
} = {};

for (let k in stored) {
  let obj = stored[k];
  cinematics[k] = Cinematic.fromJSON(k, obj);
}

async function handleCommand(message: string, sender: Player) {
  if (!message.startsWith('!')) return;

  let args = message.split(' ');
  let cmd = args[0].slice(1);
  switch (cmd) {
    case 'new': {
      let parsed = message.match(/!new\s*(\w+)?(?:\s+(.+))?/);
      if (!parsed)
        return sender.sendMessage(
          `§cAn unexpected error occurred while parsing the command§r`
        );
      let id = parsed[1];
      if (!id)
        return sender.sendMessage(
          `§cSupply an id in order to create a cinematic§r`
        );
      let cin = cinematics[id];
      if (cin) return sender.sendMessage(`§cFound existing cinematic: ${id}§r`);
      let data = parsed[2];
      if (!data) {
        cinematics[id] = new Cinematic(id);
      } else {
        try {
          let d = JSON.parse(data);
          cinematics[id] = Cinematic.fromJSON(id, d);
        } catch {
          return sender.sendMessage(
            `§cAn error occured while parsing the supplied data§r`
          );
        }
      }
      sender.sendMessage(`§aSuccessfully created cinematic: ${id}§r`);
      break;
    }
    case 'edit': {
      let id = args[1];
      let cin = cinematics[id];
      if (!cin && id == 'autosave') {
        let json = world.getDynamicProperty('autosave') as string;
        if (json) {
          try {
            cin = Cinematic.fromJSON('autosave', JSON.parse(json));
            cinematics.autosave = cin;
          } catch {}
        }
      }
      if (!cin)
        return sender.sendMessage(`§cFailed to find cinematic: ${id}§r`);
      editors.set(sender, new Editor(new CinematicPlayer(sender), cin));
      sender.sendMessage(`§aSuccessfully started editing: ${id}§r`);
      break;
    }
    case 'save': {
      let id = args[1];
      let editor = editors.get(sender);
      if (!editor)
        return sender.sendMessage(
          `§cUnable to save, you are currently not editing a cinematic§r`
        );
      cinematics[id] = editor.cinematic;
      sender.sendMessage(
        `§aSuccessfully saved §e${editor.cinematic.id}§a as §b${id}§r`
      );
      break;
    }
    case 'play': {
      let id = args[1];
      let cin = cinematics[id];
      if (!cin)
        return sender.sendMessage(`§cFailed to find cinematic: ${id}§r`);

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
      sender.sendMessage(
        `§aSuccessfully started: ${id} start: ${startNum} speed: ${speedNum}§r`
      );
      break;
    }
    case 'stop': {
      let plr = new CinematicPlayer(sender);
      let id = plr.getProp('cinematicId');
      if (!id)
        return sender.sendMessage(`§cNo cinematic is currently playing§r`);
      let cin = cinematics[id];
      if (!cin)
        return sender.sendMessage(`§cFailed to find cinematic: ${id}§r`);
      cin.stop(plr);
      sender.sendMessage(`§aSuccessfully stopped: ${id}§r`);
      break;
    }
    case 'visualize': {
      let id = args[1];
      let cin = cinematics[id];
      if (!cin)
        return sender.sendMessage(`§cFailed to find cinematic: ${id}§r`);
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
      sender.sendMessage(
        `§aSuccessfully visualizing: ${id} start: ${startNum} speed: ${speedNum}§r`
      );
      break;
    }
    case 'export': {
      let id = args[1];
      let cin = cinematics[id];
      if (!cin)
        return sender.sendMessage(`§cFailed to find cinematic: ${id}§r`);
      let res = JSON.stringify(cin.toJSON());
      let plr = new CinematicPlayer(sender);
      cin.promptCopy(plr, res);
      sender.sendMessage(`§aSuccessfully exported: ${id}§r`);
      break;
    }
    case 'bake': {
      let id = args[1];
      let cin = cinematics[id];
      if (!cin)
        return sender.sendMessage(`§cFailed to find cinematic: ${id}§r`);
      let speedStr = args[2];
      let speedNum: number | undefined;
      if (speedStr) speedNum = parseFloat(speedStr);

      if (!speedNum || isNaN(speedNum)) speedNum = 1;
      speedNum /= 20;

      sender.sendMessage(`§eBaking: ${id}§r`);
      let res = '';
      let stepStart = new Date().getTime();
      let lastK: Keyframe | undefined;
      for (let i = 0; i * speedNum < cin.timeline.length; i++) {
        let time = i * speedNum;
        let transform = cin.transformFromTime(time);
        if (!transform) continue;

        let { cmdKeyframe: cmdK } = transform;
        if (cmdK && cmdK.time !== lastK?.time) {
          lastK = cmdK;
          const cmd = cmdK.command;
          if (cmd && cmd !== '') {
            res += `execute if score @s frame matches ${i} run ${cmd}\n`;
          }
        }

        const cmd = cin.tranformToCommand(transform);
        res += `execute if score @s frame matches ${i} run ${cmd}\n`;
        if (new Date().getTime() - stepStart > 200) {
          sender.sendMessage(
            `§eBake progress: ${((time / cin.timeline.length) * 100).toFixed(
              2
            )}%%§r`
          );
          await null;
          stepStart = new Date().getTime();
        }
      }
      let plr = new CinematicPlayer(sender);
      cin.promptCopy(plr, res);
      sender.sendMessage(`§aSuccessfully baked: ${id}§r`);
      break;
    }
    default: {
      sender.sendMessage(`§cNo command found: ${cmd}§r`);
    }
  }
}

world.beforeEvents.chatSend.subscribe((evd) => {
  let { sender, message } = evd;
  if (!message.startsWith('!')) return;
  evd.cancel = true;
  system.runTimeout(() => handleCommand(message, sender), 0);
});

world.afterEvents.worldInitialize.subscribe(({ propertyRegistry: reg }) => {
  const def = new DynamicPropertiesDefinition();
  def.defineString('autosave', 9000);
  reg.registerWorldDynamicProperties(def);
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

world.afterEvents.itemUse.subscribe(async ({ source, itemStack }) => {
  if (!(source instanceof Player)) return;
  itemUse(source, itemStack.typeId);
});

let lastSave = new Date().getTime();
let prevRun = new Date().getTime();
system.run(function tick() {
  system.run(tick);

  let time = new Date().getTime();
  let delta = (time - prevRun) / 1000;
  prevRun = time;

  let unsaved = time - lastSave >= 30000;

  for (let p of world.getAllPlayers()) {
    let editor = editors.get(p);
    if (editor) {
      if (unsaved) {
        world.setDynamicProperty(
          'autosave',
          JSON.stringify(editor.cinematic.toJSON())
        );
        lastSave = time;
        unsaved = false;
      }
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
