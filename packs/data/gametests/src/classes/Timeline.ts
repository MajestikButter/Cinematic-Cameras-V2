import { JSONKeyframe, Keyframe } from './Keyframe';

export interface JSONTimeline {
  [timeCode: string]: JSONKeyframe;
}

export class Timeline {
  static fromJSON(json: JSONTimeline) {
    let line = new Timeline();
    for (let t in json) line.addKeyframe(Keyframe.fromJSON(t, json[t]));
    return line;
  }

  #keyframes = new Map<number, Keyframe>();

  get length() {
    let h = 0;
    for (let t of this.#keyframes.keys()) if (h < t) h = t;
    return h;
  }

  addKeyframe(keyframe: Keyframe) {
    this.#keyframes.set(keyframe.time, keyframe);
  }
  removeKeyframe(keyframe: Keyframe) {
    this.#keyframes.delete(keyframe.time);
  }
  getKeyframeAt(time: number) {
    return this.#keyframes.get(time);
  }
  getKeyframeAfter(
    time: number,
    include = false,
    filter: (keyframe: Keyframe) => boolean = () => true
  ) {
    let closest: Keyframe | undefined;
    for (let [currTime, keyframe] of this.#keyframes) {
      if (
        (currTime > time || (include && time == currTime)) &&
        filter(keyframe) &&
        (!closest || currTime < closest.time)
      ) {
        closest = keyframe;
      }
    }
    return closest;
  }
  getPosKeyframeAfter(time: number, include = false, ignore?: Keyframe) {
    return this.getKeyframeAfter(time, include, (k) => !!k.pos && k != ignore);
  }
  getRotKeyframeAfter(time: number, include = false, ignore?: Keyframe) {
    return this.getKeyframeAfter(time, include, (k) => !!k.rot && k != ignore);
  }

  getKeyframeBefore(
    time: number,
    include = false,
    filter: (keyframe: Keyframe) => boolean = () => true
  ) {
    let closest: Keyframe | undefined;
    for (let [currTime, keyframe] of this.#keyframes) {
      if (
        (currTime < time || (include && time == currTime)) &&
        filter(keyframe) &&
        (!closest || currTime > closest.time)
      ) {
        closest = keyframe;
      }
    }
    return closest;
  }
  getPosKeyframeBefore(time: number, include = false, ignore?: Keyframe) {
    return this.getKeyframeBefore(time, include, (k) => !!k.pos && k != ignore);
  }
  getRotKeyframeBefore(time: number, include = false, ignore?: Keyframe) {
    return this.getKeyframeBefore(time, include, (k) => !!k.rot && k != ignore);
  }
  getKeyframes() {
    return this.#keyframes.values();
  }

  toJSON() {
    let obj: JSONTimeline = {};
    for (let keyframe of this.#keyframes.values()) {
      obj[Math.round(keyframe.time * 1000) / 1000] = keyframe.toJSON();
    }
    return obj;
  }
}
