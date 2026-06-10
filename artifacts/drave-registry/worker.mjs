const API_ORIGIN = "__API_ORIGIN__";

function withSpaFallback(request, env, response) {
  if (response.status !== 404) {
    return response;
  }

  const fallbackRequest = new Request(
    new URL("/index.html", request.url),
    request,
  );
  return env.ASSETS.fetch(fallbackRequest);
}

async function proxyApi(request, apiOrigin) {
  const url = new URL(request.url);
  const targetUrl = new URL(url.pathname + url.search, apiOrigin);
  return fetch(new Request(targetUrl, request));
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      const apiOrigin = env.API_ORIGIN ?? API_ORIGIN;
      if (!apiOrigin || apiOrigin === "__API_ORIGIN__") {
        return new Response("API_ORIGIN is not configured", { status: 500 });
      }
      return proxyApi(request, apiOrigin);
    }

    return withSpaFallback(request, env, await env.ASSETS.fetch(request));
  },
};
