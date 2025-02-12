# pipe-ReadableStream-to-http-response

Test various methods of piping a readable stream to a http response. I'm searching for a pattern that's simple, easy to remember and robust.

Requirements:
* The response is closed cleanly on error.
* Internal resources are released on error, and request cancellation.
