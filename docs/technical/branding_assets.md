# Branding Assets

The server answers a deployment's [brand](/functional/branding) under `/branding`, to anyone and without authentication,
whether or not the [admin](/technical/configuration/admin) is enabled. It is what the built-in sign-in pages and the
[integrated admin](/technical/configuration/admin#admin-integrated-ui) link, and what a custom UI can link too. These paths are not part of the [API](/technical/api/): they carry no version and are
not in the OpenAPI document. What they answer is set in the [`ui` configuration](/technical/configuration/ui).

| Path                       | Content type                   | Answers                                                                                                                |
|----------------------------|--------------------------------|------------------------------------------------------------------------------------------------------------------------|
| `GET /branding/tokens.css` | `text/css`                     | every value of SympAuthy's design system as a CSS variable, with the configured colours written over SympAuthy's ones |
| `GET /branding/icon`       | `image/svg+xml` or `image/png` | the favicon and small mark                                                                                             |
| `GET /branding/logo`       | `image/svg+xml` or `image/png` | the logo for light backgrounds                                                                                         |
| `GET /branding/logo-dark`  | `image/svg+xml` or `image/png` | the logo for dark backgrounds                                                                                          |
| `GET /branding/brand.json` | `application/json`             | the display name and the dark mode                                                                                     |

Every answer carries an `ETag` and `Cache-Control: no-cache`, so a browser asks again on each load and gets a `304` when
nothing changed. Any other client gets the same by sending the tag back in `If-None-Match`. What the images are answered with is on the [Security](/technical/security#brand-images) page.

## Behind a reverse proxy

A reverse proxy has to forward `/branding` beside the other paths it forwards. Without it, the built-in sign-in pages
and the integrated admin lose their logo, their icon and the stylesheet carrying the brand's colours.

## In a custom UI

A [custom UI](/functional/interactive_flow#what-is-an-interactive-flow) hosted on another origin can link the brand with
absolute URLs rather than copying it, so a rebrand reaches it too:

```html
<link rel="stylesheet" href="https://auth.example.com/branding/tokens.css">
<link rel="icon" href="https://auth.example.com/branding/icon">

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="https://auth.example.com/branding/logo-dark">
  <img src="https://auth.example.com/branding/logo" alt="">
</picture>
```

The stylesheet and the images are meant for `<link>`, `<img>` and `<picture>`, which need no
[CORS](/technical/configuration/cors). Only `brand.json` answers CORS headers, so it is the only path a script on another
origin can read:

```js
const brand = await fetch('https://auth.example.com/branding/brand.json').then((response) => response.json())
const name = brand.display_name ?? 'My application'
```

The built-in sign-in pages link `/branding` on their own origin, so they only get the brand when served by the server
or behind the same address.

### The stylesheet

These CSS variables are the design system's *design tokens*, which have nothing to do with the server's
[access tokens](/functional/tokens). The [design system](https://sympauthy.github.io/sympauthy-design/foundations/) lists
them. Each colour is named after its [role](/functional/branding#roles), such as `--primary`, except `accent`, which is
`--gold`. Light roles and `nav-*` sit on `:root`, and dark roles apply under `prefers-color-scheme: dark` and
`[data-theme="dark"]`. A page pinning `data-theme="light"` on its `<html>` element stays light. With `dark-mode: off`, the stylesheet holds no dark role at all.

### `brand.json`

It is readable from any origin, since it holds nothing private and answers the same to everybody:

```json
{ "display_name": "Acme", "dark_mode": "auto" }
```

| Field          | Description                                                                                                                                    |
|----------------|------------------------------------------------------------------------------------------------------------------------------------------------|
| `display_name` | The name to show. Absent when neither the `default` [environment](/technical/configuration/environments) nor the deployment names one, so a page needs one of its own to fall back on. |
| `dark_mode`    | `auto` or `off`. Under `off`, a page must not choose its logo by the device's preference, as the `<source>` above does, since the stylesheet holds no dark colour. A dark area of the page's own still takes `/branding/logo-dark`. |
