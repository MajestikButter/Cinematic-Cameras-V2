import stored from "./cinematics";
import { Editor } from "./classes/Editor";
import { Cinematic } from "./classes/Cinematic";
import { world } from "@minecraft/server";

export const editors: { [id: string]: Editor } = {};

world.afterEvents.playerLeave.subscribe(
  ({ playerId }) => delete editors[playerId],
);

export const getCinematicIds = () =>
  world.getDynamicPropertyIds().filter((v) => v.startsWith("cin:")).map((v) =>
    v.slice(4)
  );

export const cinematics: {
  [id: string]: Cinematic;
} = {};

for (const id of getCinematicIds()) {
  cinematics[id] = Cinematic.load(id);
}

for (let k in stored) {
  let obj = stored[k];
  cinematics[k] = Cinematic.fromJSON(k, obj);
}
