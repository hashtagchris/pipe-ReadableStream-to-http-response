const { pipeline } = require("node:stream/promises");
const { Readable, Writable } = require("node:stream");

function naivePipeCallback(getReadStream) {
  // ❌ handles the happy path, but nothing else
  return async function (_req, res, next) {
    const readStream = await getReadStream();

    res.writeHead(200, { "Content-Type": "text/plain" });
    readStream.pipe(res);
    readStream.on("end", function () {
      next();
    });
  };
}

function robustPipeCallback(getReadStream) {
  // ✅ handles request cancellation and read stream errors
  return async function (req, res, next) {
    try {
      const readStream = await getReadStream();

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
        res.destroy();
        // If you prefer to silently truncate the response and have the client be none the wiser,
        // you can use res.end() instead.
      });
      // Note: There's no 'end' event when a stream has an error or is otherwise destroyed.
      readStream.on("close", function () {
        console.log("readStream closed");
        next();
      });

      // you can call next() here instead if you're okay with the after hook running before the response is closed
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
  return async function (_req, res, next) {
    try {
      const readStream = await getReadStream();

      res.writeHead(200, { "Content-Type": "text/plain" });

      await pipeline(readStream, res);
      next();
    } catch (err) {
      console.error(`Caught error: ${err.message}`);
      if (!res.headersSent) {
        res.send(500);
      }
      next();
    }
  };
}

function pipeToCallback(getReadStream) {
  return async function (_req, res, next) {
    try {
      const readStream = await getReadStream();
      const webStream = Readable.toWeb(readStream);
      const webRes = Writable.toWeb(res);

      res.writeHead(200, { "Content-Type": "text/plain" });

      await webStream.pipeTo(webRes);
      next();
    } catch (err) {
      console.error(`Caught error: ${err.message}`);
      if (!res.headersSent) {
        res.send(500);
      }
      next();
    }
  };
}

module.exports = {
  naivePipeCallback,
  robustPipeCallback,
  pipelineCallback,
  pipeToCallback,
};
