import { Interpolation } from '../enums/Interpolation';
import { Vector3 } from './Vector3';

export interface JSONKeyframe {
  p?: [Interpolation, number, number, number];
  r?: [Interpolation, number, number];
}

export class Keyframe {
  static fromJSON(timeCode: string, json: JSONKeyframe) {
    return new Keyframe(
      parseFloat(timeCode),
      json.r ? new Vector3(...json.r.slice(1)) : undefined,
      json.r ? json.r[0] : undefined,
      json.p ? new Vector3(...json.p.slice(1)) : undefined,
      json.p ? json.p[0] : undefined
    );
  }

  #time: number;
  #pos?: {
    value: Vector3;
    interp: Interpolation;
  };
  #rot?: {
    value: Vector3;
    interp: Interpolation;
  };

  get time() {
    return this.#time;
  }
  get pos() {
    let p = this.#pos;
    if (!p) return;
    return {
      value: p.value,
      interp: p.interp,
    };
  }
  get rot() {
    let r = this.#rot;
    if (!r) return;
    return {
      value: r.value,
      interp: r.interp,
    };
  }

  constructor(
    time: number,
    rot?: Vector3,
    rotInterp = Interpolation.linear,
    pos?: Vector3,
    posInterp = Interpolation.linear
  ) {
    this.#time = time;
    if (pos) this.#pos = { value: pos, interp: posInterp };
    if (rot) this.#rot = { value: rot, interp: rotInterp };
  }

  atTimeCode(time: number) {
    let r = this.rot;
    let p = this.pos;
    return new Keyframe(time, r?.value, r?.interp, p?.value, p?.interp);
  }

  rotInterpWith(interpolation: Interpolation) {
    let r = this.rot;
    let p = this.pos;
    return new Keyframe(
      this.time,
      r?.value,
      interpolation,
      p?.value,
      p?.interp
    );
  }

  posInterpWith(interpolation: Interpolation) {
    let r = this.rot;
    let p = this.pos;
    return new Keyframe(
      this.time,
      r?.value,
      r?.interp,
      p?.value,
      interpolation,
    );
  }

  transformed(pos: Vector3) {
    let r = this.rot;
    let p = this.pos;
    return new Keyframe(this.time, r?.value, r?.interp, pos, p?.interp);
  }

  rotated(rot: Vector3) {
    let r = this.rot;
    let p = this.pos;
    return new Keyframe(this.time, rot, r?.interp, p?.value, p?.interp);
  }

  toJSON() {
    let o: JSONKeyframe = {};
    let p = this.pos;
    if (p) o.p = [p.interp, ...p.value.toArray()];
    if (this.rot) {
      let r = this.rot;
      o.r = [r.interp, r.value.x, r.value.y];
    }
    return o;
  }
}
