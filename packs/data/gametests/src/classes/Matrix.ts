export class Matrix {
  #values: number[][];

  get rows() {
    return this.#values.length;
  }

  get columns() {
    return this.#values[0].length;
  }

  constructor(matrix: number[][]) {
    this.#values = matrix;

    let hColumnCount = 0;
    let rLen = this.#values.length;
    for (let r = 0; r < rLen; r++) {
      let row = this.#values[r];
      hColumnCount = Math.max(row.length, hColumnCount);
    }
    for (let r = 0; r < rLen; r++) {
      let row = this.#values[r];
      while (row.length < hColumnCount) row.push(0);
    }
  }

  scale(scale: number) {
    let res: number[][] = [];
    let rLen = this.#values.length;
    for (let r = 0; r < rLen; r++) {
      let row = this.#values[r];
      res[r] = [];
      for (let c = 0; c < row.length; c++) {
        res[r][c] = row[c] * scale;
      }
    }
    return new Matrix(res);
  }

  mul(matrix: Matrix) {
    const arr = matrix.asArray();
    let res: number[][] = [];
		for (let i0 = 0; i0 < arr.length; i0++) {
    	res[i0] = []
    	for (let i = 0; i < this.columns; i++) {
      	let row = arr[i0]
        let r = 0;
        for (let i1 = 0; i1 < row.length; i1++) {
					let a = row[i1]
					let b = this.#values[i1][i]
          r += a * b;
				}
        res[i0][i] = r;
			}
		}
    return new Matrix(res);
  }

  asArray() {
    return JSON.parse(JSON.stringify(this.#values));
  }
}

export const CubicMatrix = new Matrix([
  [1, 0, 0, 0],
  [-3, 3, 0, 0],
  [3, -6, 3, 0],
  [-1, 3, -3, 1],
]);

/**
 * Multiply by 1/6
 */
export const BsplineMatrix = new Matrix([
  [1, 4, 1, 0],
  [-3, 0, 3, 0],
  [3, -6, 3, 0],
  [-1, 3, -3, 1],
]);

/**
 * Multiply by 1/2
 */
export const CatmullRomMatrix = new Matrix([
  [0, 2, 0, 0],
  [-1, 0, 1, 0],
  [2, -5, 4, -1],
  [-1, 3, -3, 1],
]);