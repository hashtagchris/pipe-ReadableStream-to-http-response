# pipe-ReadableStream-to-http-response

Test various methods of piping a readable stream to a http response. I'm searching for a pattern that's simple, easy to remember and robust.

Requirements:
* The response is closed quickly on error.
* Internal resources are released on error, and request cancellation.

Nice to haves:
* Clients throw an error when the server encounters an error reading the read stream, instead of using a silently truncated response.