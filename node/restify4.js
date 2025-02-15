const restify = require("restify4");
const { Readable, Writable } = require("node:stream");
const { pipeline } = require("node:stream/promises");
const {
  CounterStream,
  SlowCounterStream,
  FlakyReadableStream,
} = require("./lib/readable-streams-for-testing");

const server = restify.createServer({ handleUncaughtExceptions: true });

// success case: /pipe/
// error case: /pipe/err
server.get("/pipe/.*", function (req, res, next) {
  const readStream = getReadStream(req.url);

  res.writeHead(200, { "Content-Type": "text/plain" });
  readStream.pipe(res);
  readStream.on("error", function (err) {
    console.error("stream error:", err.message);

    // "One important caveat is that if the Readable stream emits an error during processing,
    // the Writable destination is not closed automatically. If an error occurs, it will be
    // necessary to manually close each stream in order to prevent memory leaks."
    // - https://nodejs.org/docs/latest-v20.x/api/stream.html#readablepipedestination-options
    res.end();
    // res.destroy();
  });

  // Close the read stream if the request is canceled.
  req.on("close", function () {
    if (!readStream.closed) {
      readStream.destroy();
      console.log("request canceled");
    }
  });

  // Note: There's no 'end' event when a stream has an error or is otherwise destroyed.
  readStream.on("close", function () {
    console.log("readStream closed");
    next();
  });

  // you can call next() here instead if you're okay with the after hook running before the response is closed
});

// success case: /pipeline/
// error case: /pipeline/err
server.get("/pipeline/.*", async function (req, res, next) {
  const readStream = getReadStream(req.url);

  res.writeHead(200, { "Content-Type": "text/plain" });
  try {
    await pipeline(readStream, res);
  } catch (err) {
    console.error("pipeline error:", err.message);

    // not needed
    // res.end();
  }
  console.log("pipeline done");
  next();
});

// success case: /pipeTo/
// error case: /pipeTo/err
// not sure how to resolve curl: (18) transfer closed with outstanding read data remaining
server.get("/pipeTo/.*", async function (req, res, next) {
  const readStream = getReadStream(req.url);

  res.writeHead(200, { "Content-Type": "text/plain" });

  const webStream = Readable.toWeb(readStream);
  const webRes = Writable.toWeb(res);

  try {
    await webStream.pipeTo(webRes);
  } catch (err) {
    console.error("pipeTo error:", err.message);
    // already closed
    // webRes.close()

    // not needed
    // res.end()
  }
  console.log("pipeTo done");
  next();
});

server.pre(function (req, _res, next) {
  req.startTime = Date.now();
  console.log(`> ${req.url}`);
  next();
});

server.on("after", function (req, res) {
  const elapsed = Date.now() - req.startTime;

  console.log(`< ${req.url} ${res.statusCode} (${elapsed}ms)`);
  console.log();
});

server.on("uncaughtException", function (_req, res, _route, err) {
  console.error("restify uncaughtException:", err.code, err.message);
  if (!res.headersSent) {
    res.send(500, { error: err.message });
  }
});

server.listen(9595, function () {
  console.log(`${server.name} listening at ${server.url}`);
});

function getReadStream(url) {
  const [_empty, _method, streamType = "default", streamArg] = url.split("/");

  switch (streamType) {
    case "err":
      return new FlakyReadableStream({}, streamArg);
    case "slow":
      return new SlowCounterStream({}, streamArg);
    default:
      return new CounterStream({}, streamArg);
  }
}
