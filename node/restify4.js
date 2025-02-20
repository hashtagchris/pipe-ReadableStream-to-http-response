const restify = require("restify4");
const {
  robustPipeCallback,
  pipelineCallback,
  pipeToCallback,
} = require("./candidate-request-handlers");
const {
  CounterStream,
  SlowCounterStream,
  FlakyReadableStream,
  ReadableTestingStream,
} = require("./lib/readable-streams-for-testing");

const server = restify.createServer({ handleUncaughtExceptions: true });

// success case: /pipe/
// error case: /pipe/err
server.get("/pipe/.*", function (req, res, next) {
  const handler = robustPipeCallback(() => getReadStream(req.url));
  handler(req, res, next);
});

// success case: /pipeline/
// error case: /pipeline/err
server.get("/pipeline/.*", async function (req, res, next) {
  const handler = pipelineCallback(() => getReadStream(req.url));
  handler(req, res, next);
});

// success case: /pipeTo/
// error case: /pipeTo/err
server.get("/pipeTo/.*", async function (req, res, next) {
  const handler = pipeToCallback(() => getReadStream(req.url));
  handler(req, res, next);
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
  const [_empty, _method, streamType = "default"] = url.split("/");

  switch (streamType) {
    case "err":
      return new ReadableTestingStream({}, { errorAfter: 4 });
    case "slow":
      return new ReadableTestingStream({}, { delayMs: 200 });
    default:
      return new ReadableTestingStream();
  }
}
