import * as server from '@minecraft/server';
import { FormCancelationReason, ModalFormData } from '@minecraft/server-ui';
const { Location, MolangVariableMap, system, world } = server;

import cinematics from '../cinematics';
import { CinematicType } from '../enums/CinematicType';
import { Interpolation } from '../enums/Interpolation';
import { PlayMode } from '../enums/PlayMode';
import { Keyframe } from './Keyframe';
import { BsplineMatrix, CatmullRomMatrix, CubicMatrix, Matrix } from './Matrix';
import { CinematicPlayer } from './Player';
import { JSONTimeline, Timeline } from './Timeline';
import { Vector3 } from './Vector3';

export interface JSONCinematic {
  posType: CinematicType;
  rotType: CinematicType;
  playMode: PlayMode;
  timeline: JSONTimeline;
}

export class Cinematic {
  static fromJSON(id: string, json: typeof cinematics[string]) {
    return new Cinematic(
      id,
      json.posType,
      json.rotType,
      Timeline.fromJSON(json.timeline),
      json.playMode
    );
  }

  #id: string;
  #timeline: Timeline;
  #posType: CinematicType;
  #rotType: CinematicType;
  #playMode: PlayMode;

  /**
   * @readonly
   * @returns Cinematic identifier
   */
  get id() {
    return this.#id;
  }

  get timeline() {
    return this.#timeline;
  }

  get types() {
    return {
      pos: this.#posType,
      rot: this.#rotType,
    };
  }

  get playMode() {
    return this.#playMode;
  }

  constructor(
    id: string,
    posType = CinematicType.linearCatmull,
    rotType = CinematicType.linearCatmull,
    timeline = new Timeline(),
    playMode = PlayMode.teleport
  ) {
    this.#id = id;
    this.#posType = posType;
    this.#rotType = rotType;
    this.#timeline = timeline;
    this.#playMode = playMode;
  }

  getPoint(
    p0: Vector3,
    p1: Vector3,
    p2: Vector3,
    p3: Vector3,
    t: number,
    matrix: Matrix,
    scale = 1
  ) {
    let input = new Matrix([[1, t, Math.pow(t, 2), Math.pow(t, 3)]]);
    if (scale != 1) input = input.scale(scale);
    let infl = matrix.dot(input).asArray()[0];

    p0 = p0.scale(infl[0]);
    p1 = p1.scale(infl[1]);
    p2 = p2.scale(infl[2]);
    p3 = p3.scale(infl[3]);

    return p0.add(p1).add(p2).add(p3);
  }

  transformFromTime(time: number) {
    const line = this.timeline;
    const length = line.length;

    let currPosK = line.getPosKeyframeBefore(time, true);
    let currRotK = line.getRotKeyframeBefore(time, true);
    let prevPosK = line.getPosKeyframeBefore(time, false, currPosK);
    let prevRotK = line.getRotKeyframeBefore(time, false, currRotK);
    let nextPosK = line.getPosKeyframeAfter(time);
    let nextRotK = line.getRotKeyframeAfter(time);
    let nextPosK2 = line.getPosKeyframeAfter(time, false, nextPosK);
    let nextRotK2 = line.getRotKeyframeAfter(time, false, nextRotK);

    if (!prevPosK)
      prevPosK = new Keyframe(0, undefined, undefined, Vector3.zero);
    if (!prevRotK) prevRotK = new Keyframe(0, Vector3.zero);
    if (!currPosK)
      currPosK = new Keyframe(0, undefined, undefined, prevPosK.pos?.value);
    if (!currRotK) currRotK = new Keyframe(0, prevRotK.rot?.value);
    if (!nextPosK)
      nextPosK = new Keyframe(
        length,
        undefined,
        undefined,
        currPosK.pos?.value
      );
    if (!nextRotK) nextRotK = new Keyframe(length, currRotK.rot?.value);
    if (!nextPosK2)
      nextPosK2 = new Keyframe(
        length,
        undefined,
        undefined,
        nextPosK.pos?.value
      );
    if (!nextRotK2) nextRotK2 = new Keyframe(length, nextRotK.rot?.value);

    let prevPos = prevPosK.pos!;
    let prevRot = prevRotK.rot!;
    let currPos = currPosK.pos!;
    let currRot = currRotK.rot!;
    let nextPos = nextPosK.pos!;
    let nextRot = nextRotK.rot!;
    let nextPos2 = nextPosK2.pos!;
    let nextRot2 = nextRotK2.rot!;

    let pd = nextPosK.time - currPosK.time;
    let rd = nextRotK.time - currRotK.time;
    let pt = (time - currPosK.time) / pd;
    let rt = (time - currRotK.time) / rd;

    let pos = Vector3.zero;
    let rot = Vector3.zero;
    switch (this.#posType) {
      case CinematicType.bspline: {
        pos = this.getPoint(
          prevPos.value,
          currPos.value,
          nextPos.value,
          nextPos2.value,
          pt,
          BsplineMatrix,
          1 / 6
        );
        break;
      }
      case CinematicType.cubic: {
        pos = this.getPoint(
          currPos.value,
          prevPos.value,
          nextPos2.value,
          nextPos.value,
          pt,
          CubicMatrix,
          1 / 6
        );
        break;
      }

      case CinematicType.linearCatmull: {
        let pMatrix;
        let pScale = 1;
        switch (currPosK.pos?.interp) {
          case Interpolation.catmull: {
            pMatrix = CatmullRomMatrix;
            pScale = 1 / 2;
            break;
          }
        }
        if (pMatrix) {
          pos = this.getPoint(
            prevPos.value,
            currPos.value,
            nextPos.value,
            nextPos2.value,
            pt,
            pMatrix,
            pScale
          );
        } else {
          pos = currPos.value.lerp(nextPos.value, pt);
        }
        break;
      }
    }
    switch (this.#rotType) {
      case CinematicType.bspline: {
        rot = this.getPoint(
          prevRot.value,
          currRot.value,
          nextRot.value,
          nextRot2.value,
          rt,
          BsplineMatrix,
          1 / 6
        );
        break;
      }
      case CinematicType.cubic: {
        rot = this.getPoint(
          currRot.value,
          prevRot.value,
          nextRot2.value,
          nextRot.value,
          rt,
          CubicMatrix,
          1 / 6
        );
        break;
      }

      case CinematicType.linearCatmull: {
        let rMatrix;
        let rScale = 1;
        switch (currRotK.rot?.interp) {
          case Interpolation.catmull: {
            rMatrix = CatmullRomMatrix;
            rScale = 1 / 2;
            break;
          }
        }
        if (rMatrix) {
          rot = this.getPoint(
            prevRot.value,
            currRot.value,
            nextRot.value,
            nextRot2.value,
            rt,
            rMatrix,
            rScale
          );
        } else {
          rot = currRot.value.lerp(nextRot.value, rt);
        }
        break;
      }
    }

    return { pos, rot };
  }

  play(player: CinematicPlayer, start = 0, speed = 1, editor = false) {
    player.setProp('cinematicId', this.id);
    player.setProp('cinematicTime', start);
    player.setProp('cinematicSpeed', speed);

    let mode = this.#playMode;
    player.setProp('cinematicMode', mode);

    switch (mode) {
      case PlayMode.teleport: {
        if (!editor) player.runCommand('gamemode spectator');
        break;
      }
    }
    const { pos, rot } = this.transformFromTime(start);
    player.update(pos, rot, PlayMode.teleport);

    if (editor) player.runCommand('gamemode creative');

    return new Promise<void>((resolve) => {
      const cinId = this.id;
      system.run(function tick() {
        if (player.getProp('cinematicId') != cinId) {
          resolve();
        } else system.run(tick);
      });
    });
  }

  stop(player: CinematicPlayer) {
    let id = player.getProp('cinematicId');
    if (id != this.id) return;
    player.removeProp('cinematicId');
    player.runCommand('ride @s stop_riding');
  }

  tick(player: CinematicPlayer, delta: number) {
    let id = player.getProp('cinematicId');
    if (id != this.id) return;

    let time = player.getProp('cinematicTime')!;
    let speed = player.getProp('cinematicSpeed')!;
    time += speed * delta;

    player.setProp('cinematicTime', time);

    if (time > this.#timeline.length) return this.stop(player);

    let { pos, rot } = this.transformFromTime(time);
    let mode = player.getProp('cinematicMode') ?? PlayMode.teleport;
    player.update(pos, rot, mode);
  }

  visualize(
    start = 0,
    speed = 1,
    particle = 'minecraft:basic_flame_particle',
    keyframeParticle = 'minecraft:endrod',
    prevParticle = 'minecraft:villager_angry',
    nextParticle = 'minecraft:villager_happy'
  ) {
    return new Promise<void>((resolve, reject) => {
      if (!MolangVariableMap) return reject('missing required native classes');
      let length = this.#timeline.length;
      let stime = new Date().getTime() + start;
      const dim = world.getDimension('overworld');
      const molang = new MolangVariableMap();
      let keySchedule: number;
      keySchedule = system.runSchedule(() => {
        for (let key of this.timeline.getKeyframes()) {
          let { pos } = key;
          if (pos) {
            dim.spawnParticle(
              keyframeParticle,
              new Location(pos.value.x, pos.value.y, pos.value.z),
              molang
            );
          }
        }
      }, 20);
      let schedule: number;
      schedule = system.runSchedule(() => {
        let time = ((new Date().getTime() - stime) / 1000) * speed;
        if (time > length) {
          resolve();
          system.clearRunSchedule(keySchedule);
          return system.clearRunSchedule(schedule);
        }
        let { pos: ppos } =
          this.timeline.getPosKeyframeBefore(time, true) ??
          new Keyframe(0, undefined, undefined, Vector3.zero);
        let { pos: npos } =
          this.timeline.getPosKeyframeAfter(time) ??
          new Keyframe(length, undefined, undefined, Vector3.zero);

        if (!ppos || !npos) return;

        let { pos, rot } = this.transformFromTime(time);
        dim.spawnParticle(particle, new Location(pos.x, pos.y, pos.z), molang);
        dim.spawnParticle(
          prevParticle,
          new Location(ppos.value.x, ppos.value.y, ppos.value.z),
          molang
        );
        dim.spawnParticle(
          nextParticle,
          new Location(npos.value.x, npos.value.y, npos.value.z),
          molang
        );
      }, 1);
    });
  }

  withTypes(pos: CinematicType, rot: CinematicType) {
    return new Cinematic(this.id, pos, rot, this.timeline);
  }
  withPlayMode(mode: PlayMode) {
    return new Cinematic(
      this.id,
      this.#posType,
      this.#rotType,
      this.timeline,
      mode
    );
  }

  async promptCopy(player: CinematicPlayer, copyText: string) {
    const form = new ModalFormData()
      .title('Copy Paste')
      .textField(
        'Select the text within the box using `Ctrl` + `A` then press `Ctrl` + `C` to copy the text to clipboard',
        '',
        copyText
      );
    let res = await player.show(form);
    if (res.canceled && res.cancelationReason == FormCancelationReason.userBusy)
      await this.promptCopy(player, copyText);
  }

  toJSON() {
    return {
      posType: this.#posType,
      rotType: this.#rotType,
      playMode: this.#playMode,
      timeline: this.timeline.toJSON(),
    };
  }
}
