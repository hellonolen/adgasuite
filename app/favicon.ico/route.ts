export function GET() {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#5d2cd6"/><path fill="#fff" d="M16 7 25 25h-5.1l-1.5-3.4h-7L9.9 25H7L16 7Zm0 6.6-2.9 6h5.8L16 13.6Z"/></svg>`;
  return new Response(svg, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=86400",
    },
  });
}
