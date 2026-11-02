# Branding

Branding is what makes the pages a person signs in through, and the integrated admin, look like your product rather
than like SympAuthy: their colours, their logo and icon, and the name they show. A deployment sets these in its
[configuration](/technical/configuration/ui), and the server hands them to the pages, so changing a brand takes a
restart rather than a rebuild of the pages. With nothing configured, the pages show SympAuthy's own.

This page covers:

- [what a brand is made of](#what-a-brand-is-made-of), and what stays SympAuthy's,
- [which pages show it](#which-pages-show-it),
- [how colours are set](#colours), and dark mode,
- [how images are obtained](#images), and what happens when one cannot be,
- [how a new brand reaches people](#changing-a-brand).

## What a brand is made of

| Part    | What it is                                                                                   |
|---------|----------------------------------------------------------------------------------------------|
| A name  | shown on the sign-in pages and the admin, and in the emails carrying a validation code.      |
| Images  | an icon, used as the favicon, a logo for light backgrounds and a logo for dark backgrounds.  |
| Colours | one value per [role](#colours), for light pages and for dark ones.                           |

### What stays SympAuthy's

Only colours can be changed. Spacing, corner radii and control sizes stay as they are, since they carry accessibility
promises such as the size of a touch target. So do the status colours, because red means a failure whatever the brand.
The sign-in pages keep their "Powered by SympAuthy" footer.

There is no custom CSS, and no separate brand per application. A deployment that needs more can
[replace the sign-in pages](/functional/interactive_flow#what-is-an-interactive-flow) with its own, which can still
[use the brand](/technical/branding_assets#in-a-custom-ui).

### The name

A deployment that names nothing shows `SympAuthy`. The `default`
[environment](/technical/configuration/environments) names it explicitly. The name `SympAuthy` is drawn as SympAuthy's
wordmark with its tagline, and any other name is written as it is, without one.

## Which pages show it

**The built-in sign-in pages** show the whole brand, in light or dark according to the [dark mode](#dark-mode).

**The integrated admin** shows the whole brand too, and is the only page using the `accent` and `nav-*` roles, which
colour its sidebar. It is always light, whatever the dark mode.

**A custom sign-in UI** shows the brand if it links it, from any origin: see
[Branding Assets](/technical/branding_assets#in-a-custom-ui).

## Colours

A deployment colours **roles**: named uses of a colour rather than individual elements. Setting `primary` changes the
main button, the links and the focus ring together.

| Roles                                    | What they colour                                        |
|------------------------------------------|---------------------------------------------------------|
| `primary`, `primary-hover`, `on-primary` | the main button, links and the focus ring               |
| `primary-subtle`, `on-primary-subtle`    | tinted boxes, such as a consent summary or a selection  |
| `ground`, `surface`                      | the page behind the cards, and the cards themselves     |
| `ink-50` to `ink-900`                    | the greys: borders, labels and text                     |
| `accent`, `nav-*`                        | the admin's sidebar                                     |

The [configuration reference](/technical/configuration/ui#ui-theme-light) lists each of them.

### Nothing is derived

**A role left out keeps SympAuthy's value, even when `primary` is changed.** A deployment writing only `primary` keeps
SympAuthy's `primary-hover`, so its buttons turn Bordeaux under the pointer. Write the full set.

**The server does not check contrast.** The only colour it refuses is a badly formatted one. The
[theme builder](https://sympauthy.github.io/sympauthy-design/theme-builder/) takes one colour, derives the other
roles from it, checks every text pair against WCAG AA and writes the configuration.

### Dark mode

By default (`auto`), the sign-in pages follow the device's preference and use the dark colours and the dark logo on a
device set to dark. With `off`, they are always light, and no dark colour or dark logo is ever used. `accent` and
`nav-*` have a single value whatever the theme, so they are set for light pages only.

## Images

An image is configured as a URL or as a file path. Either way, the server obtains it at startup, holds it in memory and
answers it itself. **The browser only ever asks the server, so whoever hosts a logo never learns that someone is signing
in.**

SVG and PNG are accepted, up to 1 MiB, and are recognised by their content rather than by their name.

| Image       | When not configured                                 |
|-------------|-----------------------------------------------------|
| `icon`      | SympAuthy's icon                                    |
| `logo`      | SympAuthy's logo                                    |
| `logo-dark` | `logo` if it is configured, or SympAuthy's dark one |

A deployment setting only `logo` keeps SympAuthy's icon in the browser tab, so set both to show only your own brand.

### When an image cannot be obtained

| What went wrong                                                                               | What the server does                                                                                                                     | What people see                                                     |
|-----------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------|
| A file that is missing, unreadable, over 1 MiB or neither an SVG nor a PNG                    | reports an [invalid configuration](/technical/configuration/#a-key-that-binds-to-nothing), and takes readiness down                      | SympAuthy's whole brand, as for any error in the `ui` configuration |
| A URL whose host does not answer: a connection failure, a timeout, a `408`, a `429` or a `5xx` | reports a degraded [condition](/technical/monitoring/conditions), stays ready, and tries again every 30 seconds                          | SympAuthy's image, then the deployment's once the host answers      |
| A URL answering anything else that is not a usable image, any other `4xx` included            | writes one ERROR line and does not try again                                                                                             | SympAuthy's image until a restart                                   |

## Changing a brand

A new colour, name or image takes a restart, like any other configuration change. It then shows at once: the pages ask
the server whether each part of the brand has changed every time they load, so a browser never keeps showing the old
logo, and it downloads nothing again when nothing changed.
