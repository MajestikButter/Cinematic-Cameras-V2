import {
  DynamicPropertiesDefinition,
  MinecraftEntityTypes,
  Player,
  system,
  world,
  EntityInventoryComponent,
} from '@minecraft/server';

import { Cinematic } from './classes/Cinematic';
import { Keyframe } from './classes/Keyframe';
import { Vector3 } from './classes/Vector3';
import { CinematicType } from './enums/CinematicType';
import { Interpolation } from './enums/Interpolation';
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

let keys = [
  new Keyframe(0, Vector3.zero, undefined, Vector3.zero),
  new Keyframe(
    0.8,
    undefined,
    undefined,
    new Vector3(-3, 10, 6),
    Interpolation.catmull
  ),
  new Keyframe(1.5, new Vector3(30, 30), Interpolation.linear),
  new Keyframe(
    2.7,
    undefined,
    undefined,
    new Vector3(-6, 14, 7),
    Interpolation.catmull
  ),
  new Keyframe(4, new Vector3(30, 80), undefined, undefined, undefined),
  new Keyframe(5.6, new Vector3(30, 150), Interpolation.catmull),
  new Keyframe(
    6.9,
    undefined,
    undefined,
    new Vector3(7, 23, 10),
    Interpolation.linear
  ),
  new Keyframe(7.8, new Vector3(30, 80), Interpolation.linear),
  new Keyframe(9, Vector3.zero, undefined, Vector3.zero),
];

let testLinear = new Cinematic(
  'testLinear',
  CinematicType.linearCatmull,
  CinematicType.linearCatmull
);
let testCatmull = new Cinematic(
  'testCatmull',
  CinematicType.linearCatmull,
  CinematicType.linearCatmull
);
let testCubic = new Cinematic(
  'testCubic',
  CinematicType.cubic,
  CinematicType.cubic
);
let testMix = new Cinematic(
  'testMix',
  CinematicType.linearCatmull,
  CinematicType.bspline
);
let testBspline = new Cinematic(
  'testBspline',
  CinematicType.bspline,
  CinematicType.bspline
);

for (let key of keys) {
  testLinear.timeline.addKeyframe(key.rotInterpWith(Interpolation.linear));
  testCatmull.timeline.addKeyframe(key.rotInterpWith(Interpolation.catmull));
  testCubic.timeline.addKeyframe(key);
  testMix.timeline.addKeyframe(key);
  testBspline.timeline.addKeyframe(key);
}

cinematics[testLinear.id] = testLinear;
cinematics[testCatmull.id] = testCatmull;
cinematics[testCubic.id] = testCubic;
cinematics[testMix.id] = testMix;
cinematics[testBspline.id] = testBspline;
world.events.beforeChat.subscribe((evd) => {
  let { sender, message } = evd;
  if (!message.startsWith('!')) return;
  evd.cancel = true;
  let args = message.split(' ');
  let cmd = args[0].slice(1);
  switch (cmd) {
    case 'new': {
      let id = args[1];
      let cin = cinematics[id];
      if (!cin) return sender.tell(`§cFound existing cinematic: ${id}§r`);
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
      let id = sender.getDynamicProperty('cinematicId') as string;
      let cin = cinematics[id];
      if (!cin) return sender.tell(`§cFailed to find cinematic: ${id}§r`);
      cin.stop(new CinematicPlayer(sender));
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
      console.warn(JSON.stringify(cin.toJSON()));
      sender.tell(`§aSuccessfully exporting: ${id}§r`);
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
      console.warn(res);
      break;
    }
    default: {
      sender.tell(`§cNo command found: ${cmd}§r`);
    }
  }
});

world.events.worldInitialize.subscribe(({ propertyRegistry: reg }) => {
  const def = new DynamicPropertiesDefinition();
  def.defineNumber('cinematicSpeed');
  def.defineNumber('cinematicTime');
  def.defineString('cinematicId', 32);
  reg.registerEntityTypeDynamicProperties(def, MinecraftEntityTypes.player);
});

async function itemUse(source: Player, itemId: string) {
  let editor = editors.get(source);
  if (!editor) return;
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

    let id = p.getDynamicProperty('cinematicId') as string;
    if (!id) continue;
    let cin = cinematics[id];
    if (!cin) continue;
    cin.tick(new CinematicPlayer(p), delta);
  }
});
