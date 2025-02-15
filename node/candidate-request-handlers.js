const { pipeline } = require("node:stream/promises");

function naivePipeCallback(getReadStream) {
  // ❌ handles the happy path, but nothing else
  return function (_req, res, next) {
    const readStream = getReadStream();

    res.writeHead(200, { "Content-Type": "text/plain" });
    readStream.pipe(res);
    readStream.on("end", function () {
      next();
    });
  };
}

function robustPipeCallback(getReadStream) {
  // ✅ handles request cancellation and read stream errors
  return function (req, res, next) {
    try {
      const readStream = getReadStream();

      res.writeHead(200, { "Content-Type": "text/plain" });

      req.on("close", function () {
        if (!readStream.closed) {
          console.log("request canceled - destroying readStream");
          readStream.destroy();
        }
      });

      readStream.pipe(res);
      readStream.on("error", function (err) {
        console.error(`Error while piping readStream: ${err.message}`);

        // "One important caveat is that if the Readable stream emits an error during processing,
        // the Writable destination is not closed automatically. If an error occurs, it will be
        // necessary to manually close each stream in order to prevent memory leaks."
        // - https://nodejs.org/docs/latest-v20.x/api/stream.html#readablepipedestination-options
        res.end();
      });
      readStream.on("close", function () {
        next();
      });
    } catch (err) {
      // Most likely an error getting the read stream object
      console.error(`Caught error: ${err.message}`);
      if (!res.headersSent) {
        res.send(500);
      }
      next();
    }
  };
}

function pipelineCallback(getReadStream) {
  return async function (req, res, next) {
    try {
      const readStream = getReadStream();

      res.writeHead(200, { "Content-Type": "text/plain" });

      // req.on("close", function () {
      //   if (!readStream.closed) {
      //     console.log("request canceled - destroying readStream");
      //     readStream.destroy();
      //   }
      // });

      await pipeline(readStream, res);
      next();
    } catch (err) {
      // Most likely an error getting the read stream object
      console.error(`Caught error: ${err.message}`);
      if (!res.headersSent) {
        res.send(500);
      }
      next();
    }
  };
}

module.exports = { naivePipeCallback, robustPipeCallback, pipelineCallback };
