import * as server from "@minecraft/server";
const { MolangVariableMap, system, world } = server;

import cinematics from "../cinematics";
import { CinematicType } from "../enums/CinematicType";
import { Interpolation } from "../enums/Interpolation";
import { PlayMode } from "../enums/PlayMode";
import { Keyframe } from "./Keyframe";
import { BsplineMatrix, CatmullRomMatrix, CubicMatrix, Matrix } from "./Matrix";
import { CinematicPlayer } from "./Player";
import { JSONTimeline, Timeline } from "./Timeline";
import { Vector3 } from "./Vector3";

export interface JSONCinematic {
  posType: CinematicType;
  rotType: CinematicType;
  playMode: PlayMode;
  timeline: JSONTimeline;
}

interface Transform {
  pos: Vector3;
  rot: Vector3;
  rotKeyframe: Keyframe;
  posKeyframe: Keyframe;
  cmdKeyframe?: Keyframe;
}

export class Cinematic {
  static fromJSON(id: string, json: (typeof cinematics)[string]) {
    return new Cinematic(
      id,
      json.posType,
      json.rotType,
      Timeline.fromJSON(json.timeline),
      json.playMode,
    );
  }

  static load(id: string) {
    const data = world.getDynamicProperty(`cin:${id}`);
    if (typeof data !== "string") {
      throw `Could not find a cinematic with the id '${id}'`;
    }
    return Cinematic.fromJSON(id, JSON.parse(data));
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
    posType = CinematicType.mixed,
    rotType = CinematicType.mixed,
    timeline = new Timeline(),
    playMode = PlayMode.teleport,
  ) {
    this.#id = id;
    this.#posType = posType;
    this.#rotType = rotType;
    this.#timeline = timeline;
    this.#playMode = playMode;
  }

  getInfluence(t: number, matrix: Matrix, scale = 1) {
    let input = new Matrix([[1, t, Math.pow(t, 2), Math.pow(t, 3)]]);
    if (scale != 1) input = input.scale(scale);
    return matrix.mul(input).asArray()[0];
  }

  getPoint(
    p0: Vector3,
    p1: Vector3,
    p2: Vector3,
    p3: Vector3,
    t: number,
    matrix: Matrix,
    scale = 1,
  ) {
    let infl = this.getInfluence(t, matrix, scale);

    p0 = p0.scale(infl[0]);
    p1 = p1.scale(infl[1]);
    p2 = p2.scale(infl[2]);
    p3 = p3.scale(infl[3]);

    return p0.add(p1).add(p2).add(p3);
  }

  getValue(
    v0: number,
    v1: number,
    v2: number,
    v3: number,
    t: number,
    matrix: Matrix,
    scale = 1,
  ) {
    let infl = this.getInfluence(t, matrix, scale);
    return v0 * infl[0] + v1 * infl[1] + v2 * infl[2] + v3 * infl[3];
  }

  transformFromTime(time: number): Transform | undefined {
    const line = this.timeline;
    const length = line.length;

    if (time > length) return;

    let currPosK = line.getPosKeyframeBefore(time, true);
    let currRotK = line.getRotKeyframeBefore(time, true);
    let prevPosK = line.getPosKeyframeBefore(time, false, currPosK);
    let prevRotK = line.getRotKeyframeBefore(time, false, currRotK);
    let nextPosK = line.getPosKeyframeAfter(time);
    let nextRotK = line.getRotKeyframeAfter(time);
    let nextPosK2 = line.getPosKeyframeAfter(time, false, nextPosK);
    let nextRotK2 = line.getRotKeyframeAfter(time, false, nextRotK);

    if (!prevPosK) {
      if (currPosK) {
        prevPosK = new Keyframe(
          0,
          undefined,
          undefined,
          undefined,
          currPosK.pos?.value,
        );
      } else {
        prevPosK = new Keyframe(
          0,
          undefined,
          undefined,
          undefined,
          Vector3.zero,
        );
      }
    }
    if (!prevRotK) {
      if (currRotK) {
        prevRotK = new Keyframe(0, currRotK.rot?.value);
      } else prevRotK = new Keyframe(0, Vector3.zero);
    }

    if (!currPosK) {
      currPosK = new Keyframe(
        0,
        undefined,
        undefined,
        undefined,
        prevPosK.pos?.value,
      );
    }
    if (!currRotK) currRotK = new Keyframe(0, prevRotK.rot?.value);

    if (!nextPosK) {
      nextPosK = new Keyframe(
        length,
        undefined,
        undefined,
        undefined,
        currPosK.pos?.value,
      );
    }
    if (!nextRotK) nextRotK = new Keyframe(length, currRotK.rot?.value);
    if (!nextPosK2) {
      nextPosK2 = new Keyframe(
        length,
        undefined,
        undefined,
        undefined,
        nextPosK.pos?.value,
      );
    }
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
    if (!pd || isNaN(pd)) pd = 0.05;
    let rd = nextRotK.time - currRotK.time;
    if (!rd || isNaN(pd)) rd = 0.05;
    let pt = (time - currPosK.time) / pd;
    let rt = (time - currRotK.time) / rd;

    let toDeg = 180 / Math.PI;
    let toRad = Math.PI / 180;

    function yDir(vec: Vector3) {
      return new Vector3(Math.cos(vec.y * toRad), Math.sin(vec.y * toRad));
    }

    let prevRotX = prevRot.value.x;
    let currRotX = currRot.value.x;
    let nextRotX = nextRot.value.x;
    let nextRot2X = nextRot2.value.x;

    let prevRotY = yDir(prevRot.value);
    let currRotY = yDir(currRot.value);
    let nextRotY = yDir(nextRot.value);
    let nextRot2Y = yDir(nextRot2.value);

    let pos = Vector3.zero;
    let rotX = 0;
    let rotY = Vector3.zero;

    if (currPos.constant) {
      pos = currPos.value;
    } else {
      switch (this.#posType) {
        case CinematicType.bspline: {
          pos = this.getPoint(
            prevPos.value,
            currPos.value,
            nextPos.value,
            nextPos2.value,
            pt,
            BsplineMatrix,
            1 / 6,
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
          );
          break;
        }

        case CinematicType.mixed: {
          let pMatrix;
          let pScale = 1;
          const pinterp = currPos.interp;
          switch (pinterp) {
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
              pScale,
            );
          } else {
            pos = currPos.value.lerp(nextPos.value, pt);
          }
          break;
        }
      }
    }

    if (currRot.constant) {
      rotX = currRot.value.x;
      rotY = currRotY;
    } else {
      switch (this.#rotType) {
        case CinematicType.bspline: {
          rotX = this.getValue(
            prevRotX,
            currRotX,
            nextRotX,
            nextRot2X,
            rt,
            BsplineMatrix,
            1 / 6,
          );
          rotY = this.getPoint(
            prevRotY,
            currRotY,
            nextRotY,
            nextRot2Y,
            rt,
            BsplineMatrix,
            1 / 6,
          );
          break;
        }
        case CinematicType.cubic: {
          rotX = this.getValue(
            prevRotX,
            currRotX,
            nextRotX,
            nextRot2X,
            rt,
            CubicMatrix,
          );
          rotY = this.getPoint(
            prevRotY,
            currRotY,
            nextRotY,
            nextRot2Y,
            rt,
            CubicMatrix,
          );
          break;
        }

        case CinematicType.mixed: {
          let rMatrix;
          let rScale = 1;
          const rinterp = currRot.interp;
          switch (rinterp) {
            case Interpolation.catmull: {
              rMatrix = CatmullRomMatrix;
              rScale = 1 / 2;
              break;
            }
          }
          if (rMatrix) {
            rotX = this.getValue(
              prevRotX,
              currRotX,
              nextRotX,
              nextRot2X,
              rt,
              rMatrix,
              rScale,
            );
            rotY = this.getPoint(
              prevRotY,
              currRotY,
              nextRotY,
              nextRot2Y,
              rt,
              rMatrix,
              rScale,
            );
          } else {
            rotX = currRot.value.lerp(nextRot.value, rt).x;
            rotY = currRotY.lerp(nextRotY, rt);
          }
          break;
        }
      }
    }

    return {
      pos,
      rot: new Vector3(rotX, Math.atan2(rotY.y, rotY.x) * toDeg),
      rotKeyframe: currRotK,
      posKeyframe: currPosK,
      cmdKeyframe: this.timeline.getKeyframeBefore(
        time,
        true,
        (k) => k.command !== "",
      ),
    };
  }

  transformToCommand(transform: Transform) {
    const [x, y, z] = transform.pos.toArray().map((v) => v.toFixed(3));
    const [rx, ry] = transform.rot.toArray().map((v) => v.toFixed(3));

    switch (this.playMode) {
      case PlayMode.teleport:
        return `tp ${x} ${y} ${z} ${ry} ${rx}`;
      case PlayMode.camera:
        return `camera @s set minecraft:free ease 0.07 linear pos ${x} ${y} ${z} rot ${rx} ${ry}`;
    }
  }

  play(player: CinematicPlayer, start = 0, speed = 1, editor = false) {
    player.setProp("cinematicId", this.id);
    player.setProp("cinematicTime", start);
    player.setProp("cinematicSpeed", speed);

    let mode = this.#playMode;
    player.setProp("cinematicMode", mode);

    player.runCommand("inputpermission set @s camera disabled");
    player.runCommand("inputpermission set @s movement disabled");

    switch (mode) {
      case PlayMode.teleport: {
        if (!editor) player.runCommand("gamemode spectator");
        break;
      }
      case PlayMode.camera: {
        if (!editor) player.runCommand("gamemode spectator");
        break;
      }
    }
    let transform = this.transformFromTime(start);
    if (transform) {
      const { pos, rot } = transform;
      player.update(pos, rot, mode);
    }

    if (editor) player.runCommand("gamemode creative");

    return new Promise<void>((resolve) => {
      const cinId = this.id;
      system.run(function tick() {
        if (player.getProp("cinematicId") != cinId) {
          resolve();
        } else system.run(tick);
      });
    });
  }

  #lastCmdKs = new Map<string, Keyframe>();
  stop(player: CinematicPlayer) {
    let id = player.getProp("cinematicId");
    if (id != this.id) return;

    player.runCommand("inputpermission set @s camera enabled");
    player.runCommand("inputpermission set @s movement enabled");

    player.removeProp("cinematicId");
    player.runCommand("ride @s stop_riding");

    if (this.playMode == PlayMode.camera) player.runCommand("camera @s clear");

    this.#lastCmdKs.delete(player.id);
  }

  tick(player: CinematicPlayer, delta: number) {
    let id = player.getProp("cinematicId");
    if (id != this.id) return;

    let time = player.getProp("cinematicTime")!;
    let speed = player.getProp("cinematicSpeed")!;
    time += speed * delta;

    player.setProp("cinematicTime", time);

    if (time > this.#timeline.length) return this.stop(player);

    let transform = this.transformFromTime(time);
    if (!transform) return;
    const pId = player.id;
    const lastK = this.#lastCmdKs.get(pId);
    let { cmdKeyframe: cmdK } = transform;
    if (cmdK && cmdK.time !== lastK?.time) {
      this.#lastCmdKs.set(pId, cmdK);
      const cmd = cmdK.command;
      if (cmd && cmd !== "") {
        player.runCommand(cmd);
      }
    }
    let { pos, rot } = transform;
    let mode = player.getProp("cinematicMode") ?? PlayMode.teleport;
    player.update(pos, rot, mode);
  }

  visualize(
    start = 0,
    speed = 1,
    particle = "minecraft:basic_flame_particle",
    keyframeParticle = "minecraft:endrod",
    prevParticle = "minecraft:villager_angry",
    nextParticle = "minecraft:villager_happy",
    dim = world.getDimension("overworld"),
  ) {
    return new Promise<void>((resolve, reject) => {
      if (!MolangVariableMap) return reject("missing required native classes");
      let length = this.#timeline.length;
      let stime = new Date().getTime() + start;
      const molang = new MolangVariableMap();
      let keySchedule: number;
      keySchedule = system.runInterval(() => {
        for (let key of this.timeline.getKeyframes()) {
          let { pos } = key;
          if (pos) {
            try {
              dim.spawnParticle(keyframeParticle, pos.value, molang);
            } catch {}
          }
        }
      }, 20);
      let schedule: number;
      schedule = system.runInterval(() => {
        let time = ((new Date().getTime() - stime) / 1000) * speed;
        if (time > length) {
          resolve();
          system.clearRun(keySchedule);
          return system.clearRun(schedule);
        }
        let { pos: ppos } = this.timeline.getPosKeyframeBefore(time, true) ??
          new Keyframe(0, undefined, undefined, undefined, Vector3.zero);
        let { pos: npos } = this.timeline.getPosKeyframeAfter(time) ??
          new Keyframe(length, undefined, undefined, undefined, Vector3.zero);

        if (!ppos || !npos) return;

        let transform = this.transformFromTime(time);
        if (transform) {
          let { pos } = transform;
          if (!isNaN(pos.x) && !isNaN(pos.y) && !isNaN(pos.z)) {
            try {
              dim.spawnParticle(particle, pos, molang);
            } catch {}
          }
        }
        try {
          dim.spawnParticle(prevParticle, ppos.value, molang);
        } catch {}
        try {
          dim.spawnParticle(nextParticle, npos.value, molang);
        } catch {}
      }, 1);
    });
  }

  withId(id: string) {
    return new Cinematic(
      id,
      this.#posType,
      this.#rotType,
      this.timeline,
      this.#playMode,
    );
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
      mode,
    );
  }

  toJSON() {
    return {
      posType: this.#posType,
      rotType: this.#rotType,
      playMode: this.#playMode,
      timeline: this.timeline.toJSON(),
    };
  }

  save(suffix = "") {
    world.setDynamicProperty(
      `cin:${this.id}${suffix}`,
      JSON.stringify(this.toJSON()),
    );
  }
  delete() {
    world.setDynamicProperty(`cin:${this.id}`);
  }
}
