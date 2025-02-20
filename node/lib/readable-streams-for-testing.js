const { Readable } = require("node:stream");

// https://nodejs.org/docs/latest-v20.x/api/stream.html#an-example-counting-stream
// https://nodejs.org/docs/latest-v20.x/api/stream.html#errors-while-reading
class ReadableTestingStream extends Readable {
  constructor(opt, { chunks = 10, errorAfter = Infinity, delayMs = 0 } = {}) {
    // https://nodejs.org/docs/latest-v20.x/api/stream.html#new-streamreadableoptions
    super(opt);
    this.chunks = chunks;
    this.errorAfter = errorAfter;
    this.delayMs = delayMs;
    this.index = 0;
  }

  _read() {
    setTimeout(() => {
      this.index++;
      if (this.index > this.errorAfter) {
        this.destroy(new Error("sorry to disturb your reading"));
      } else if (this.index > this.chunks) {
        this.push(null);
      } else {
        const str = `${this.index}\n`;
        const buf = Buffer.from(str, "ascii");
        this.push(buf);
      }
    }, this.delayMs);
  }
}

module.exports = { ReadableTestingStream };
