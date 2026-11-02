# Branding

Branding is what makes the pages a person signs in through, and the
[integrated admin](/technical/configuration/admin#admin-integrated-ui), look like your product rather than like
SympAuthy: their colours, their logo and icon, and the name they show. A deployment sets these in its
[configuration](/technical/configuration/ui), so changing a brand is a configuration change and a restart, and nothing
has to be rebuilt. With nothing configured, the pages show SympAuthy's own. Nothing an application sends or receives
changes with the brand: it is set once per deployment, and only the pages and the emails show it.

This page covers:

- [what a brand is made of](#what-a-brand-is-made-of), and what stays SympAuthy's,
- [which pages show it](#which-pages-show-it),
- [how colours are set](#colours), through [roles](#roles) and [dark mode](#dark-mode),
- [how images are obtained](#images), and what happens when one cannot be,
- [how a new brand reaches people](#changing-a-brand).

## What a brand is made of

| Part    | What it is                                                                                   |
|---------|----------------------------------------------------------------------------------------------|
| A name  | shown on the sign-in pages and the admin, and in the emails carrying a [validation code](/technical/security#email-validation). |
| Images  | an icon, used as the favicon, a logo for light backgrounds and a logo for dark backgrounds.  |
| Colours | one value per [role](#roles), for light pages and for dark ones.                             |

### What stays SympAuthy's

Of the pages' look, only the colours can be changed. Spacing, corner radii and control sizes stay as they are, since they carry accessibility
promises such as the size of a touch target. So do the status colours, because red means a failure whatever the brand.
The sign-in pages keep their "Powered by SympAuthy" footer.

There is no custom CSS, and no separate brand per application. A deployment that needs more can
[replace the sign-in pages](/functional/interactive_flow#what-is-an-interactive-flow) with its own, which can still
[use the brand](/technical/branding_assets#in-a-custom-ui).

### The name

The `default` [environment](/technical/configuration/environments) sets the name to `SympAuthy`. A deployment without
that environment or a name of its own has none, and the pages and emails then show `SympAuthy` too. That name is drawn
in SympAuthy's own lettering with its tagline underneath, and any other name is written plainly, with no tagline.

## Which pages show it

**The built-in sign-in pages** show the whole brand, in light or dark according to the [dark mode](#dark-mode).

**The integrated admin**, the admin pages the server serves at `/admin` when
[`admin.integrated-ui`](/technical/configuration/admin#admin-integrated-ui) is on, shows the whole brand too. It is the
only page using the `accent` and `nav-*` roles, which colour its sidebar. It is always light, whatever the dark mode,
and draws the dark logo on that dark sidebar.

**A custom sign-in UI** shows the brand if it links it, even when it is hosted on another address: see
[Branding Assets](/technical/branding_assets#in-a-custom-ui).

## Colours

A deployment sets its colours role by role, once for light pages and once for dark ones, and any role it leaves out
keeps SympAuthy's value.

### Roles

A **role** is a named use of a colour rather than an individual element. Setting `primary` changes the
main button, the links and the focus ring together.

| Roles                                    | What they colour                                        |
|------------------------------------------|---------------------------------------------------------|
| `primary`, `primary-hover`, `on-primary` | the main button, links and the focus ring               |
| `primary-subtle`, `on-primary-subtle`    | tinted boxes, such as a [consent](/functional/consent) summary or a selection |
| `ground`, `surface`                      | the page behind the cards, and the cards themselves     |
| `ink-50` to `ink-900`                    | the greys: borders, labels and text                     |
| `accent`, `nav-*`                        | the admin's sidebar                                     |

The [configuration reference](/technical/configuration/ui#ui-theme-light) lists each of them.

### Nothing is derived

**A role left out keeps SympAuthy's value, even when `primary` is changed.** A deployment writing only `primary` keeps
SympAuthy's `primary-hover`, so its buttons turn SympAuthy's dark red under the pointer. Write every role that has to
match your colours, and at least `primary`, `primary-hover`, `on-primary`, `primary-subtle` and `on-primary-subtle`
together.

**The server does not check contrast.** The only colour value it refuses is a badly formatted one. The
[theme builder](https://sympauthy.github.io/sympauthy-design/theme-builder/) takes one colour, derives the other
roles from it, checks every text pair against WCAG AA, the usual accessibility standard for contrast, and writes the full set of roles.

### Dark mode

[`ui.theme.dark-mode`](/technical/configuration/ui#ui-theme) is `auto` by default: the sign-in pages follow the device's
preference, and use the dark colours and the dark logo on a device set to dark. With `off`, they are always light, and
the device's preference never picks a dark colour or the dark logo. `accent` and `nav-*` have a single value whatever
the theme, so they are written under `ui.theme.light` and apply whatever the theme.

## Images

An image is configured as a URL, or as the path of a file on the machine the server runs on: in a container, mount the
file first. Either way, the server obtains it at startup and answers it itself. **The browser only ever asks the server, so whoever hosts a logo never learns that someone is signing
in.**

SVG and PNG are accepted, up to 1 MiB, and are recognised by their content rather than by their name. An SVG in UTF-16 is refused.

| Image       | When not configured                                 |
|-------------|-----------------------------------------------------|
| `icon`      | SympAuthy's icon                                    |
| `logo`      | SympAuthy's logo                                    |
| `logo-dark` | `logo` if it is configured, or SympAuthy's dark one |

A deployment setting only `logo` keeps SympAuthy's icon in the browser tab, so set both to show only your own brand.

### When an image cannot be obtained

| What went wrong                                                                               | What the server does                                                                                                                     | What people see                                                     |
|-----------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------|
| A file that is missing, unreadable, over 1 MiB or neither an SVG nor a PNG                    | reports a configuration error naming the key, and takes [readiness](/technical/monitoring/conditions#on-health) down | SympAuthy's whole brand |
| A URL whose host does not answer: a connection failure, a timeout, a `408`, a `429` or a `5xx` | reports a degraded [condition](/technical/monitoring/conditions), stays ready, and tries again every 30 seconds                          | the image answered when it is [not configured](#images), then the deployment's once the host answers |
| A URL answering anything else that is not a usable image, any other `4xx` included            | writes one ERROR line and does not try again                                                                                             | the image answered when it is [not configured](#images), until a restart |

**Any error in the `ui` configuration**, such as a badly formatted colour or a wrong file, has the same effect as the
first row: the pages show SympAuthy's whole brand, name and colours included, until it is corrected and the server
restarted.

## Changing a brand

A new colour, name or image takes a restart, like any other configuration change. It then shows at once: the pages ask
the server whether each part of the brand has changed every time they load, so a browser never keeps showing the old
logo, and it downloads nothing again when nothing changed.
