import { ModalFormData } from '@minecraft/server-ui';
import { Player } from '@minecraft/server';
import { Vector3 } from './Vector3';
interface Properties {
  cinematicTime: number;
  cinematicSpeed: number;
  cinematicId: string;
}

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

  update(pos: Vector3, rot: Vector3) {
    let player = this.#player;
    player.teleport(pos.toObject(), player.dimension, rot.x, rot.y);
  }
  getProp<p extends keyof Properties>(prop: p): Properties[p] | undefined {
    const p = this.#player;
    return p.getDynamicProperty(prop) as any;
  }
  setProp<p extends keyof Properties>(prop: p, value: Properties[p]) {
    const p = this.#player;
    return p.setDynamicProperty(prop, value);
  }
  removeProp(prop: keyof Properties) {
    const p = this.#player;
    return p.removeDynamicProperty(prop);
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
