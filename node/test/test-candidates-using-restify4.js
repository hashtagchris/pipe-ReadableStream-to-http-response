const test = require("node:test");
const assert = require("node:assert");
const restify = require("restify4");
const {
  CounterStream,
  FlakyReadableStream,
  SlowCounterStream,
} = require("../lib/readable-streams-for-testing");
const candidates = require("../candidate-request-handlers");

async function testAllCandidates() {
  const server = restify.createServer({ handleUncaughtExceptions: true });
  server.listen(9999);
  let testNumber = 0;

  for (const candidateName of Object.keys(candidates)) {
    const candidate = candidates[candidateName];

    await test(candidateName, async (t) => {
      await t.test("happy path", { timeout: 1000 }, async (t) => {
        const readStream = new CounterStream();
        const getReadStream = () => Promise.resolve(readStream);

        const spy = {};
        const path = `/test${testNumber++}`;
        server.get(path, callbackWrapper(candidate(getReadStream), spy));

        const response = await fetch(`http://localhost:9999${path}`);
        assert.equal(response.status, 200);

        const textStream = response.body.pipeThrough(new TextDecoderStream());

        let responseText = "";
        for await (const chunk of textStream) {
          responseText += chunk;
        }

        assert.equal(responseText, "1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n");

        assert.ok(spy.done);
        assert.ok(readStream.closed);
        assert.ok(spy.req.closed);
        assert.ok(spy.res.closed);
      });

      await t.test(
        "error retrieving read stream object",
        { timeout: 1000 },
        async (t) => {
          const getReadStream = () => Promise.reject(new Error("no stream for you"));

          const spy = {};
          const path = `/test${testNumber++}`;
          server.get(path, callbackWrapper(candidate(getReadStream), spy));

          const response = await fetch(`http://localhost:9999${path}`);
          assert.equal(response.status, 500);

          // skip retrieving and checking the response body

          assert.ok(spy.done);
          assert.ok(spy.req.closed);
          assert.ok(spy.res.closed);
        }
      );

      await t.test("flaky read stream", { timeout: 1000 }, async (t) => {
        const readStream = new FlakyReadableStream();
        const getReadStream = () => Promise.resolve(readStream);

        const spy = {};
        const path = `/test${testNumber++}`;
        server.get(path, callbackWrapper(candidate(getReadStream), spy));

        const response = await fetch(`http://localhost:9999${path}`);
        assert.equal(response.status, 200);

        let responseText = "";
        const textStream = response.body.pipeThrough(new TextDecoderStream());

        // Ideally the client can detect the response stream was interrupted,
        // and doesn't use the response body, despite the 200 OK status code.
        await assert.rejects(
          async () => {
            for await (const chunk of textStream) {
              responseText += chunk;
            }
          },
          (err) => {
            assert.equal(err.message, "terminated");
            return true;
          }
        );

        // We're not dictating how much of a response was returned, but any text
        // returned should count up from 1.
        assert.ok("1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n".startsWith(responseText));

        assert.ok(spy.done);
        assert.ok(readStream.closed);
        assert.ok(spy.req.closed);
        assert.ok(spy.res.closed);
      });

      await t.test("canceled request", { timeout: 9000 }, async (t) => {
        const readStream = new SlowCounterStream();
        const getReadStream = () => Promise.resolve(readStream);

        const spy = {};
        const path = `/test${testNumber++}`;
        server.get(path, callbackWrapper(candidate(getReadStream), spy));

        const controller = new AbortController();
        setTimeout(() => {
          controller.abort();
        }, 1200);
        const response = await fetch(`http://localhost:9999${path}`, {
          signal: controller.signal,
        });
        assert.equal(response.status, 200);

        let responseText = "";
        const textStream = response.body.pipeThrough(new TextDecoderStream());

        await assert.rejects(
          async () => {
            for await (const chunk of textStream) {
              responseText += chunk;
            }
          },
          (err) => {
            assert.equal(err.message, "This operation was aborted");
            return true;
          }
        );

        // We're not dictating how much of a response was returned, but any text
        // returned should count up from 1.
        assert.ok("1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n".startsWith(responseText));

        if (!spy.done) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }

        assert.ok(spy.done);
        assert.ok(readStream.closed);
        assert.ok(readStream.destroyed);
        assert.ok(spy.req.closed);
        assert.ok(spy.res.closed);
      });
    });

    function callbackWrapper(handler, spy) {
      return function (req, res, next) {
        spy.req = req;
        spy.res = res;
        handler(req, res, function (...args) {
          spy.done = true;
          next(args);
        });
      };
    }
  }
  server.close();
}

testAllCandidates();
