const { Readable } = require("node:stream");

// https://nodejs.org/docs/latest-v20.x/api/stream.html#an-example-counting-stream
class CounterStream extends Readable {
  constructor(opt, max) {
    super(opt);
    if (max === undefined) max = 10;
    this._max = max;
    this._index = 0;
  }

  _read() {
    this._index++;
    if (this._index > this._max) this.push(null);
    else {
      const str = `${this._index}\n`;
      const buf = Buffer.from(str, "ascii");
      this.push(buf);
    }
  }
}

class SlowCounterStream extends Readable {
  constructor(opt, max) {
    super(opt);
    if (max === undefined) max = 10;
    this._max = max;
    this._index = 0;
  }

  _read() {
    setTimeout(() => {
      this._index++;
      if (this._index > this._max) this.push(null);
      else {
        const str = `${this._index}\n`;
        const buf = Buffer.from(str, "ascii");
        this.push(buf);
      }
    }, 200);
  }
}

// https://nodejs.org/docs/latest-v20.x/api/stream.html#errors-while-reading
class FlakyReadableStream extends Readable {
  constructor(opt, successfulReadCount) {
    super(opt);

    if (successfulReadCount === undefined) successfulReadCount = 4;
    this._max = successfulReadCount;
    this._index = 0;
  }

  _read() {
    this._index++;
    if (this._index > this._max) this.destroy(new Error("boom"));
    else {
      const str = `${this._index}\n`;
      const buf = Buffer.from(str, "ascii");
      this.push(buf);
    }
  }
}

module.exports = { CounterStream, SlowCounterStream, FlakyReadableStream };
