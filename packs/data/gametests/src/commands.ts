import { Player, system, world } from "@minecraft/server";
import { CinematicPlayer } from "./classes/Player";
import { Cinematic } from "./classes/Cinematic";
import { cinematics, editors, getCinematicIds } from "./loaded";
import { Editor } from "./classes/Editor";
import { Keyframe } from "./classes/Keyframe";
import { MessageFormData } from "@minecraft/server-ui";
import { forcedShowForm, promptCopy } from "./utils";

async function handleCommand(command: string, message: string, sender: Player) {
  let args = message.split(" ");
  switch (command) {
    case "help": {
      const cmds = [
        [
          "!list",
          "Lists all cinematics saved to the world.",
        ],
        [
          "!new <cinematicId: string> [data: JSONCinematic]",
          "Creates a new cinematic.",
        ],
        [
          "!delete <cinematicId: string>",
          "Deletes a saved cinematic.",
        ],
        [
          "!edit <cinematicId: string>",
          "Opens the editor for the specified cinematic.",
        ],
        [
          "!save <cinematicId: string>",
          "Saves the cinematic that is currently being edited with a new cinematic id.",
        ],
        [
          "!play <cinematicId: string> [start: number] [speed: number]",
          "Plays the specified cinematic.",
        ],
        [
          "!stop",
          "Stops playing the current cinematic.",
        ],
        [
          "!visualize <cinematicId: string> [start: number] [speed: number]",
          "Visualizes the path a cinematic takes using particles.",
        ],
        [
          "!export <cinematicId: string>",
          "Prompts the Copy Paste form with an object representation of the cinematic. Used to save cinematics in an editable state.",
        ],
        [
          "!bake <cinematicId: string> [stepSpeed: number]",
          "Prompts the Copy Paste form with an mcfunction version of the cinematic. Used to convert cinematics into a non-experimental state via commands.",
        ],
      ];

      sender.sendMessage(`§2--- Showing help page ---`);
      for (const [usage, desc] of cmds) {
        sender.sendMessage(`${usage}\n  ${desc}`);
      }
      break;
    }
    case "list": {
      const ids = getCinematicIds();
      if (ids.length <= 0) {
        return sender.sendMessage(
          `§cNo cinematics saved to the world§r`,
        );
      }
      sender.sendMessage(
        `§aList of all saved cinematics (${ids.length})§r\n${
          ids.sort().map((v) => `- ${v}`).join("\n")
        }`,
      );
      break;
    }
    case "delete": {
      const id = args[0];
      if (!id) {
        return sender.sendMessage(`§cSupply a cinematic id to delete§r`);
      }
      if (!cinematics[id]) {
        return sender.sendMessage(`§c${id} is not an existing cinematic§r`);
      }
      const form = new MessageFormData()
        .title("Are you sure?").body(
          `By clicking 'Confirm', you will delete the cinematic §l§b${id}§r. Are you sure you would like to do this? This action is irreversable.`,
        )
        .button1("Confirm").button2("Cancel");
      const resp = await forcedShowForm(sender, form);
      if (resp.selection !== 0) break;
      const cin = cinematics[id];
      if (!cin) break;
      cin.delete();
      delete cinematics[id];
      break;
    }
    case "new": {
      let parsed = message.match(/(\w+)?(?:\s+(.+))?/);
      if (!parsed) {
        return sender.sendMessage(
          `§cAn unexpected error occurred while parsing the command§r`,
        );
      }
      let id = parsed[1];
      if (!id) {
        return sender.sendMessage(
          `§cSupply an id in order to create a cinematic§r`,
        );
      }
      let cin = cinematics[id];
      if (cin) return sender.sendMessage(`§cFound existing cinematic: ${id}§r`);
      let data = parsed[2];
      if (!data) {
        cin = new Cinematic(id);
      } else {
        try {
          let d = JSON.parse(data);
          cin = Cinematic.fromJSON(id, d);
        } catch {
          return sender.sendMessage(
            `§cAn error occured while parsing the supplied data§r`,
          );
        }
      }
      cinematics[id] = cin;
      cin.save();
      sender.sendMessage(`§aSuccessfully created cinematic: ${id}§r`);
      break;
    }
    case "edit": {
      let id = args[0];
      let cin = cinematics[id];
      if (!cin) {
        return sender.sendMessage(`§cFailed to find cinematic: ${id}§r`);
      }
      editors[sender.id] = new Editor(new CinematicPlayer(sender), cin);
      sender.sendMessage(`§aSuccessfully started editing: ${id}§r`);
      break;
    }
    case "save": {
      let id = args[0];
      let editor = editors[sender.id];
      if (!editor) {
        return sender.sendMessage(
          `§cUnable to save, you are currently not editing a cinematic§r`,
        );
      }
      const newCin = editor.cinematic.withId(id);
      cinematics[id] = newCin;
      newCin.save();
      sender.sendMessage(
        `§aSuccessfully saved §r${editor.cinematic.id}§a as §r${id}`,
      );
      break;
    }
    case "play": {
      let id = args[0];
      let cin = cinematics[id];
      if (!cin) {
        return sender.sendMessage(`§cFailed to find cinematic: ${id}§r`);
      }

      let startStr = args[1];
      let startNum: number | undefined;
      if (startStr) startNum = parseFloat(startStr);
      let speedStr = args[2];
      let speedNum: number | undefined;
      if (speedStr) speedNum = parseFloat(speedStr);
      cin.play(
        new CinematicPlayer(sender),
        startNum && !isNaN(startNum) ? startNum : 0,
        speedNum && !isNaN(speedNum) ? speedNum : 1,
      );
      sender.sendMessage(
        `§aSuccessfully started: ${id} start: ${startNum} speed: ${speedNum}§r`,
      );
      break;
    }
    case "stop": {
      let plr = new CinematicPlayer(sender);
      let id = plr.getProp("cinematicId");
      if (!id) {
        return sender.sendMessage(`§cNo cinematic is currently playing§r`);
      }
      let cin = cinematics[id];
      if (!cin) {
        return sender.sendMessage(`§cFailed to find cinematic: ${id}§r`);
      }
      cin.stop(plr);
      sender.sendMessage(`§aSuccessfully stopped: ${id}§r`);
      break;
    }
    case "visualize": {
      let id = args[0];
      let cin = cinematics[id];
      if (!cin) {
        return sender.sendMessage(`§cFailed to find cinematic: ${id}§r`);
      }
      let startStr = args[1];
      let startNum: number | undefined;
      if (startStr) startNum = parseFloat(startStr);
      let speedStr = args[2];
      let speedNum: number | undefined;
      if (speedStr) speedNum = parseFloat(speedStr);
      let particle = args[3];
      cin.visualize(
        startNum && !isNaN(startNum) ? startNum : 0,
        speedNum && !isNaN(speedNum) ? speedNum : 1,
        particle,
      );
      sender.sendMessage(
        `§aSuccessfully visualizing: ${id} start: ${startNum} speed: ${speedNum}§r`,
      );
      break;
    }
    case "export": {
      let id = args[0];
      let cin = cinematics[id];
      if (!cin) {
        return sender.sendMessage(`§cFailed to find cinematic: ${id}§r`);
      }
      let res = JSON.stringify(cin.toJSON());
      promptCopy(sender, res);
      sender.sendMessage(`§aSuccessfully exported: ${id}§r`);
      break;
    }
    case "bake": {
      let id = args[0];
      let cin = cinematics[id];
      if (!cin) {
        return sender.sendMessage(`§cFailed to find cinematic: ${id}§r`);
      }
      let speedStr = args[1];
      let speedNum: number | undefined;
      if (speedStr) speedNum = parseFloat(speedStr);

      if (!speedNum || isNaN(speedNum)) speedNum = 1;
      speedNum /= 20;

      sender.sendMessage(`§eBaking: ${id}§r`);
      let res = "";
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
          if (cmd && cmd !== "") {
            res += `execute if score @s frame matches ${i} run ${cmd}\n`;
          }
        }

        const cmd = cin.transformToCommand(transform);
        res += `execute if score @s frame matches ${i} run ${cmd}\n`;
        if (new Date().getTime() - stepStart > 200) {
          sender.sendMessage(
            `§eBake progress: ${
              ((time / cin.timeline.length) * 100).toFixed(
                2,
              )
            }%%§r`,
          );
          await null;
          stepStart = new Date().getTime();
        }
      }

      promptCopy(sender, res);
      sender.sendMessage(`§aSuccessfully baked: ${id}§r`);
      break;
    }
    default: {
      sender.sendMessage(`§cNo command found: $command}§r`);
    }
  }
}

world.beforeEvents.chatSend.subscribe((evd) => {
  const { sender, message } = evd;
  const commandMatch = message.match(/!(\w+)/);
  if (
    !commandMatch ||
    (!sender.isOp() && !sender.hasTag("cinematicsPerms"))
  ) return;
  evd.cancel = true;

  const command = commandMatch[0].slice(1);
  const msg = message.slice(command.length + 1).trimStart();
  system.run(() => handleCommand(command, msg, sender));
});

system.afterEvents.scriptEventReceive.subscribe((ev) => {
  const ent = ev.sourceEntity;
  if (!(ent instanceof Player)) return;
  handleCommand(ev.id.slice(4), ev.message, ent);
}, { namespaces: ["cin"] });
