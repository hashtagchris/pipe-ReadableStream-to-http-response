## Manually testing

1. Install dependencies using `npm install`
2. Run `node restify4.js` in one terminal window
3. Use `curl -v` or your favorite rest client to request the URLs below.

## URLs
### [readable.pipe](https://nodejs.org/api/stream.html#readablepipedestination-options)
* http://localhost:9595/pipe/
* http://localhost:9595/pipe/err
* http://localhost:9595/pipe/slow

### [await stream.pipeline](https://nodejs.org/api/stream.html#streampipelinesource-transforms-destination-options)
* http://localhost:9595/pipeline/
* http://localhost:9595/pipeline/err
* http://localhost:9595/pipeline/slow

### [await WebAPI-ReadableStream.pipeTo](https://nodejs.org/docs/latest-v20.x/api/webstreams.html#readablestreampipetodestination-options) ([mdn docs](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream/pipeTo))
* http://localhost:9595/pipeTo/
* http://localhost:9595/pipeTo/err
* http://localhost:9595/pipeTo/slow