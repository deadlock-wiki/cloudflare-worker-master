# cloudflare-worker-theme-cookies
intercepts requests and ignores anything that is not HTML.

parses the incoming cookies looking for theme and mode.

sanitizes those values so nobody can inject weird characters into the HTML. allows lowercase letters, numbers, and hyphens.

defaults to dark mode and a brown theme if the cookies are missing or invalid.

uses Cloudflare's HTMLRewriter to add data-theme and data-mode attributes right onto the main element.

sets the cache control header to private.
