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

  get pos() {
    let p = this.#player;
    return new Vector3(p.location);
  }

  get rot() {
    let p = this.#player;
    return new Vector3(p.rotation.x, p.rotation.y);
  }

  constructor(player: Player) {
    this.#player = player;
  }

  update(pos: Vector3, rot: Vector3, mode: PlayMode) {
    const player = this.#player;
    const dim = player.dimension;
    if (mode == PlayMode.teleport) {
      player.teleport(pos.toObject(), dim, rot.x, rot.y);
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
  show<f extends { show: (arg0: Player) => any }>(
    form: f
  ): ReturnType<f['show']> {
    return form.show(this.#player);
  }
}
