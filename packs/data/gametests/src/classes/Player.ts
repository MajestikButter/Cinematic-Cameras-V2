import { Player } from '@minecraft/server';
import { Vector3 } from './Vector3';
import { PlayMode } from '../enums/PlayMode';
interface Properties {
  cinematicTime?: number;
  cinematicSpeed?: number;
  cinematicId?: string;
  cinematicMode?: PlayMode;
}

const PropertyMap = new Map<string, Properties>();
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
          `camera @s set minecraft:free ease 0.07 linear pos ${x} ${y} ${z} rot ${rx} ${ry}`
        );
      }
    }
  }

  #createProps() {
    const p = this.#player;
    const props = {
      cinematicTime: 0,
      cinematicMode: 0,
      cinematicSpeed: 1,
    };
    PropertyMap.set(p.id, props);
    return props;
  }

  #getProps() {
    const p = this.#player;
    let props = PropertyMap.get(p.id);
    if (!props) props = this.#createProps();
    return props;
  }

  getProp<p extends keyof Properties>(prop: p): Properties[p] {
    // const p = this.#player;
    const props = this.#getProps();
    // return p.getDynamicProperty(prop) as any;
    return props[prop];
  }
  setProp<p extends keyof Properties>(prop: p, value: Properties[p]) {
    // const p = this.#player;
    this.#getProps()[prop] = value;
    // return p.setDynamicProperty(prop, value);
  }
  removeProp(prop: keyof Properties) {
    // const p = this.#player;
    delete this.#getProps()[prop];
    // return p.removeDynamicProperty(prop);
  }
  runCommand(command: string) {
    return this.#player.runCommandAsync(command);
  }
  setActionbar(text: string) {
    this.#player.onScreenDisplay.setActionBar(text);
  }
  show<f extends { show: (plr: Player) => any }>(
    form: f
  ): ReturnType<f['show']> {
    return form.show(this.#player);
  }
}
