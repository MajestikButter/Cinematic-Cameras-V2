import { Matrix } from './Matrix';

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export class Vector3 {
  static get zero() {
    return new Vector3();
  }
  static get up() {
    return new Vector3(0, 1);
  }
  static get down() {
    return new Vector3(0, -1);
  }
  static get left() {
    return new Vector3(-1);
  }
  static get right() {
    return new Vector3(1);
  }
  static get forward() {
    return new Vector3(0, 0, 1);
  }
  static get back() {
    return new Vector3(0, 0, -1);
  }

  #x: number;
  #y: number;
  #z: number;

  /**
   * @readonly
   * @returns the x property of this Vector3
   */
  get x() {
    return this.#x;
  }
  /**
   * @readonly
   * @returns the y property of this Vector3
   */
  get y() {
    return this.#y;
  }
  /**
   * @readonly
   * @returns the z property of this Vector3
   */
  get z() {
    return this.#z;
  }

  constructor(vecLike: Vector3Like);
  constructor(x?: number, y?: number, z?: number);
  constructor(x: Vector3Like | number = 0, y = 0, z = 0) {
    if (typeof x == 'object') {
      z = x.z;
      y = x.y;
      x = x.x;
    }

    this.#x = x;
    this.#y = y;
    this.#z = z;
  }

  /**
   * Executes a function on each property of this Vector3
   * @param func the function to run on each property
   * @returns new Vector3 with the returned values of each function call
   */
  execFunc(func: (prop: 'x' | 'y' | 'z', value: number) => number) {
    return new Vector3(func('x', this.x), func('y', this.y), func('z', this.z));
  }

  add(vecLike: Vector3Like) {
    return this.execFunc((p, v) => v + vecLike[p]);
  }
  sub(vecLike: Vector3Like) {
    return this.execFunc((p, v) => v - vecLike[p]);
  }
  mul(vecLike: Vector3Like) {
    return this.execFunc((p, v) => v * vecLike[p]);
  }
  div(vecLike: Vector3Like) {
    return this.execFunc((p, v) => v / vecLike[p]);
  }
  scale(scale: number) {
    return this.execFunc((p, v) => v * scale);
  }

  /**
   * Lerps this Vector3 to another Vector3
   * @param vecLike destination
   * @param t control
   * @returns new Vector3
   */
  lerp(vecLike: Vector3Like, t: number) {
    return this.execFunc((p, v) => lerp(v, vecLike[p], t));
  }

  lerpCurveMatrix(
    dest: Vector3,
    c0: Vector3,
    c1: Vector3,
    t: number,
    matrix: Matrix,
    scale: number = 1
  ) {
    let input = new Matrix([[1, t, Math.pow(t, 2), Math.pow(t, 3)]]);
    if (scale != 1) input = input.scale(scale);
    let infl = matrix.dot(input).asArray()[0];

    let p0 = this.scale(infl[0])
    let p1 = c0.scale(infl[1])
    let p2 = c1.scale(infl[2])
    let p3 = dest.scale(infl[3])

    return p0.add(p1).add(p2).add(p3);
  }

  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  toObject() {
    return {
      x: this.x,
      y: this.y,
      z: this.z,
    };
  }
}
