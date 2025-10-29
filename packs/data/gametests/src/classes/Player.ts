import { Container, ItemStack, Player } from "@minecraft/server";
import { Vector3 } from "./Vector3";
import { PlayMode } from "../enums/PlayMode";
interface Properties {
  cinematicTime?: number;
  cinematicSpeed?: number;
  cinematicId?: string;
  cinematicMode?: PlayMode;
}

const PROPERTIES: Properties = {
  cinematicTime: 0,
  cinematicMode: 0,
  cinematicSpeed: 1,
};

export class CinematicPlayer {
  #player: Player;

  get id() {
    return this.#player.id;
  }

  get dimension() {
    return this.#player.dimension;
  }

  get pos() {
    let p = this.#player;
    return new Vector3(p.location);
  }

  get rot() {
    let p = this.#player;
    const rot = p.getRotation();
    return new Vector3(rot.x, rot.y);
  }

  #inventory?: Container;
  get inventory() {
    if (!this.#inventory) {
      this.#inventory = this.#player.getComponent("inventory")?.container;
    }
    return this.#inventory!;
  }

  constructor(player: Player) {
    this.#player = player;
  }

  update(pos: Vector3, rot: Vector3, mode: PlayMode) {
    const player = this.#player;
    const dim = player.dimension;
    switch (mode) {
      case PlayMode.teleport: {
        player.teleport(pos, {
          dimension: dim,
          rotation: rot,
        });
        break;
      }
      case PlayMode.camera: {
        let { x, y, z } = pos;
        let { x: rx, y: ry } = rot;
        x = Math.floor(x * 1000) / 1000;
        y = Math.floor(y * 1000) / 1000;
        z = Math.floor(z * 1000) / 1000;
        rx = Math.floor(rx * 1000) / 1000;
        ry = Math.floor(ry * 1000) / 1000;
        player.runCommand(
          `camera @s set minecraft:free ease 0.07 linear pos ${x} ${y} ${z} rot ${rx} ${ry}`,
        );
      }
    }
  }

  getProp<p extends keyof Properties>(prop: p): Properties[p] {
    return <any> this.#player.getDynamicProperty(prop) ?? PROPERTIES[prop];
  }
  setProp<p extends keyof Properties>(prop: p, value: Properties[p]) {
    return this.#player.setDynamicProperty(prop, value);
  }
  removeProp(prop: keyof Properties) {
    return this.#player.setDynamicProperty(prop, undefined);
  }
  runCommand(command: string) {
    return this.#player.runCommand(command);
  }
  setActionbar(text: string) {
    this.#player.onScreenDisplay.setActionBar(text);
  }
  setItem(slot: number, item?: ItemStack) {
    const cont = this.inventory;
    if (!cont) return;
    cont.setItem(slot, item);
  }
  show<f extends { show: (plr: Player) => any }>(
    form: f,
  ): ReturnType<f["show"]> {
    return form.show(this.#player);
  }
}
