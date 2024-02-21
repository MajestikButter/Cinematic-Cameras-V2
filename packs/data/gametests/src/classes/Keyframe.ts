import { Interpolation } from "../enums/Interpolation";
import { Vector3 } from "./Vector3";

export interface JSONKeyframe {
  p?: [Interpolation, number, number, number];
  pc?: boolean;
  r?: [Interpolation, number, number];
  rc?: boolean;
  cmd?: string;
}

export class Keyframe {
  static fromJSON(timeCode: string, json: JSONKeyframe) {
    return new Keyframe(
      parseFloat(timeCode),
      json.r ? new Vector3(...json.r.slice(1)) : undefined,
      json.r ? json.r[0] : undefined,
      json.rc,
      json.p ? new Vector3(...json.p.slice(1)) : undefined,
      json.p ? json.p[0] : undefined,
      json.pc,
      json.cmd,
    );
  }

  #time: number;
  #pos?: {
    value: Vector3;
    interp: Interpolation;
    constant: boolean;
  };
  #rot?: {
    value: Vector3;
    interp: Interpolation;
    constant: boolean;
  };
  #command: string;

  get time() {
    return this.#time;
  }
  get pos() {
    let p = this.#pos;
    if (!p) return;
    return {
      value: p.value,
      interp: p.interp,
      constant: p.constant,
    };
  }
  get rot() {
    let r = this.#rot;
    if (!r) return;
    return {
      value: r.value,
      interp: r.interp,
      constant: r.constant,
    };
  }
  get command() {
    return this.#command;
  }

  constructor(
    time: number,
    rot?: Vector3,
    rotInterp = Interpolation.linear,
    rotConstant = false,
    pos?: Vector3,
    posInterp = Interpolation.linear,
    posConstant = false,
    command = "",
  ) {
    this.#time = Math.floor(time * 100) / 100;
    this.#command = command;
    if (pos) {
      this.#pos = { value: pos, interp: posInterp, constant: posConstant };
    }
    if (rot) {
      this.#rot = { value: rot, interp: rotInterp, constant: rotConstant };
    }
  }

  atTimeCode(time: number) {
    let r = this.rot;
    let p = this.pos;
    return new Keyframe(
      time,
      r?.value,
      r?.interp,
      r?.constant,
      p?.value,
      p?.interp,
      p?.constant,
      this.command,
    );
  }

  rotInterpWith(interpolation: Interpolation) {
    let r = this.rot;
    let p = this.pos;
    return new Keyframe(
      this.time,
      r?.value,
      interpolation,
      r?.constant,
      p?.value,
      p?.interp,
      p?.constant,
      this.command,
    );
  }

  posInterpWith(interpolation: Interpolation) {
    let r = this.rot;
    let p = this.pos;
    return new Keyframe(
      this.time,
      r?.value,
      r?.interp,
      r?.constant,
      p?.value,
      interpolation,
      p?.constant,
      this.command,
    );
  }

  transformed(pos: Vector3) {
    let r = this.rot;
    let p = this.pos;
    return new Keyframe(
      this.time,
      r?.value,
      r?.interp,
      r?.constant,
      pos,
      p?.interp,
      p?.constant,
      this.command,
    );
  }

  rotated(rot: Vector3) {
    let r = this.rot;
    let p = this.pos;
    return new Keyframe(
      this.time,
      rot,
      r?.interp,
      r?.constant,
      p?.value,
      p?.interp,
      p?.constant,
      this.command,
    );
  }

  toJSON() {
    let o: JSONKeyframe = {};
    let p = this.pos;
    if (p) {
      o.p = [
        p.interp,
        ...p.value.execFunc((_, v) => Math.floor(v * 1000) / 1000).toArray(),
      ];
      o.pc = p.constant;
    }
    let r = this.rot;
    if (r) {
      o.r = [
        r.interp,
        Math.floor(r.value.x * 1000) / 1000,
        Math.floor(r.value.y * 1000) / 1000,
      ];
      o.rc = r.constant;
    }
    const cmd = this.#command;
    if (cmd !== "") o.cmd = cmd;

    return o;
  }
}
