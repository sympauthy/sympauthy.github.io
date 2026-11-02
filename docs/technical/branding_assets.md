# Branding Assets

The server answers a deployment's [brand](/functional/branding) under `/branding`, to anyone and without authentication,
whether or not the [admin](/technical/configuration/admin) is enabled. It is what the built-in sign-in pages and the
integrated admin link, and what a custom UI can link too. These paths are not part of the [API](/technical/api/): they carry no version and are
not in the OpenAPI document. What they answer is set in the [`ui` configuration](/technical/configuration/ui).

| Path                       | Answers                                                                                     |
|----------------------------|---------------------------------------------------------------------------------------------|
| `GET /branding/tokens.css` | every design token, with the configured colours written over SympAuthy's values              |
| `GET /branding/icon`       | the favicon and small mark                                                                  |
| `GET /branding/logo`       | the logo for light backgrounds                                                              |
| `GET /branding/logo-dark`  | the logo for dark backgrounds                                                               |
| `GET /branding/brand.json` | the display name and the dark mode                                                          |

Every answer carries an `ETag` and `Cache-Control: no-cache`, so a browser asks again on each load and gets a `304` when
nothing changed. What the images are answered with is on the [Security](/technical/security#brand-images) page.

## Behind a reverse proxy

A reverse proxy has to forward `/branding` beside `/api`, `/flow` and `/admin`. Without it, the built-in sign-in pages
and the integrated admin lose their logo, their icon and the stylesheet carrying the brand's colours.

## In a custom UI

A [custom UI](/functional/interactive_flow#what-is-an-interactive-flow) hosted on another origin can link the brand with
absolute URLs rather than copying it, so a rebrand reaches it too:

```html
<link rel="stylesheet" href="https://auth.example.com/branding/tokens.css">
<link rel="icon" href="https://auth.example.com/branding/icon">
```

The built-in sign-in pages link `/branding` on their own origin, so they only get the brand when served by the server
or behind the same address.

### The stylesheet

Each token is a CSS variable named after its [role](/functional/branding#colours), such as `--primary`, except `accent`, which is `--gold`. Light roles
and `nav-*` sit on `:root`, and dark roles apply under `prefers-color-scheme: dark` and `[data-theme="dark"]`. A page
pinning `data-theme="light"` stays light. With `dark-mode: off`, the stylesheet holds no dark role at all.

### `brand.json`

It is readable from any origin, since it holds nothing private and answers the same to everybody:

```json
{ "display_name": "Acme", "dark_mode": "auto" }
```

| Field          | Description                                                                                                                                    |
|----------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| `display_name` | The name to show. Absent when none is configured, so a page needs one of its own to fall back on.                                               |
| `dark_mode`    | `auto` or `off`. Under `off`, a page must not show `/branding/logo-dark`, even on a device set to dark, because the page itself will stay light. |
