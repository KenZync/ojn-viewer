import LRU from "lru-cache";
const cache = new LRU({
  max: 200,
  ttl: 1000 * 60 * 60 * 24, // One Day
});

export default defineEventHandler(async (event) => {
  let startTime;
  let duration;

  const abortController = new AbortController();
  let timer = null;

  const id = getRouterParam(event, "id");
  const url = `https://github.com/KenZync/O2Jam-Database/raw/main/dmjam/${id}`;

  if (!cache.get(url)) {
    const response = $fetch(url, {
      retry: 10,
      signal: abortController.signal,

      // Log request
      async onRequest({ request, options }) {
        timer = setTimeout(() => {
          abortController.abort();
          console.log(`Retrying request to: ${request}`);
        }, 2500); // Abort request in 2.5s.

        startTime = new Date().getTime();
        options.headers = new Headers(options.headers);
        options.headers.set("starttime", `${new Date().getTime()}`);
        await console.log(
          `%c[${new Date().toLocaleTimeString()}] %cSSR-Request: %c${request}`,
          "color: gray",
          "color: orange",
          "color: white"
        );
      },

      // Log response
      async onResponse({ request, response }) {
        if (timer) {
          clearTimeout(timer); // clear timer
        }

        const currentTime = new Date().getTime();
        duration = currentTime - startTime;
        await console.log(
          `✔️%cSSR-Response: ${request} - ${response.status} %c(${duration}ms)`,
          "color: orange",
          "color: white"
        );
      },

      // Log error
      async onResponseError({ error }) {
        await console.error('%cSSR-Error', error,
          'color: white; background: red;',
        );
      },
    });

    // Set response to cache
    cache.set(url, response);
    return response;
  }

  // Log a cache hit to a given request URL
  console.log(`%c[SSR] Cache hit: ${url}`, 'color: orange');
  return cache.get(url);
});
