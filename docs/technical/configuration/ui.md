# UI

The `ui` keys set the deployment's [brand](/functional/branding): the name, images and colours of the sign-in pages and
the integrated admin. Every colour is written as `#rrggbb` **in quotes**, since YAML reads an unquoted `#` as the start of a
comment. The `ink-*` [roles](/functional/branding#colours) can only be set in a file: `UI_THEME_LIGHT_INK_50` does not reach `ink-50`, while
`UI_THEME_LIGHT_PRIMARY_HOVER` does reach `primary-hover`.

## ```ui```

| Key                | Type             | Description                                                                                                                                 | Required<br>Default                                             |
|--------------------|------------------|---------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------|
| ```display-name``` | string           | The name the sign-in pages, the admin and the validation-code emails show.                                                                  | NO<br>```SympAuthy```                                           |
| ```icon```         | url or file path | The favicon and small mark. A value starting with `http://` or `https://` is fetched, and anything else is read as a file. SVG or PNG, up to 1 MiB. | NO<br>SympAuthy's icon                                          |
| ```logo```         | url or file path | The logo for light backgrounds, in the same form as `icon`.                                                                                 | NO<br>SympAuthy's logo                                          |
| ```logo-dark```    | url or file path | The logo for dark backgrounds, in the same form as `icon`.                                                                                  | NO<br>`logo` if it is configured, otherwise SympAuthy's dark logo |
| ```theme```        | object           | See [`ui.theme`](#ui-theme).                                                                                                                | NO                                                              |

## ```ui.theme```

| Key             | Type   | Description                                                                                                                                                                    | Required<br>Default |
|-----------------|--------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|---------------------|
| ```dark```      | object | The colours of dark pages. See [`ui.theme.dark`](#ui-theme-dark). Cannot be written alongside `dark-mode: off`.                                                                | NO                  |
| ```dark-mode``` | string | `auto`: the sign-in pages follow the device. `off`: they are always light. An unquoted `off`, which YAML reads as `false`, is accepted as `off`.                                  | NO<br>```auto```    |
| ```light```     | object | The colours of light pages. See [`ui.theme.light`](#ui-theme-light).                                                                                                           | NO                  |

## ```ui.theme.light```

Each role left out keeps SympAuthy's value.

| Key                     | Type   | Description                                                     | Required<br>Default    |
|-------------------------|--------|-----------------------------------------------------------------|------------------------|
| ```accent```            | colour | The rule on the admin sidebar's current entry.                  | NO<br>SympAuthy's value |
| ```ground```            | colour | The page behind every card.                                     | NO<br>SympAuthy's value |
| ```ink-50```            | colour | Table header rows and the fill of a secondary button.           | NO<br>SympAuthy's value |
| ```ink-100```           | colour | The hover of a secondary button and the fill of a grey tag.     | NO<br>SympAuthy's value |
| ```ink-200```           | colour | The borders of cards, menus and dialogs, and dividers.          | NO<br>SympAuthy's value |
| ```ink-300```           | colour | Decorative marks, such as skeleton bars.                        | NO<br>SympAuthy's value |
| ```ink-400```           | colour | The borders of controls and placeholder icons.                  | NO<br>SympAuthy's value |
| ```ink-500```           | colour | Field labels and helper text.                                   | NO<br>SympAuthy's value |
| ```ink-600```           | colour | The icons in controls.                                          | NO<br>SympAuthy's value |
| ```ink-700```           | colour | The text in controls and secondary buttons.                     | NO<br>SympAuthy's value |
| ```ink-800```           | colour | Strong secondary text.                                          | NO<br>SympAuthy's value |
| ```ink-900```           | colour | Primary text and headings.                                      | NO<br>SympAuthy's value |
| ```nav-active```        | colour | The fill of the admin sidebar's current entry.                  | NO<br>SympAuthy's value |
| ```nav-disabled```      | colour | A sidebar entry the signed-in administrator cannot open.        | NO<br>SympAuthy's value |
| ```nav-divider```       | colour | The rules between sidebar sections.                             | NO<br>SympAuthy's value |
| ```nav-ground```        | colour | The background of the admin sidebar.                            | NO<br>SympAuthy's value |
| ```nav-hover```         | colour | A sidebar entry under the pointer.                              | NO<br>SympAuthy's value |
| ```nav-muted```         | colour | Sidebar section labels.                                         | NO<br>SympAuthy's value |
| ```nav-text```          | colour | Sidebar entries.                                                | NO<br>SympAuthy's value |
| ```on-primary```        | colour | The text and icons on `primary` and `primary-hover`.            | NO<br>SympAuthy's value |
| ```on-primary-subtle``` | colour | The text on `primary-subtle`.                                   | NO<br>SympAuthy's value |
| ```primary```           | colour | The main button, links and the focus ring.                      | NO<br>SympAuthy's value |
| ```primary-hover```     | colour | A primary button or link under the pointer.                     | NO<br>SympAuthy's value |
| ```primary-subtle```    | colour | Tinted boxes, such as a consent summary or a selected item.     | NO<br>SympAuthy's value |
| ```surface```           | colour | Cards, tables, dialogs, menus and inputs.                       | NO<br>SympAuthy's value |

## ```ui.theme.dark```

The same roles as [`ui.theme.light`](#ui-theme-light), except `accent` and `nav-*`, which have one value whatever the
theme and are refused here. Each role left out keeps SympAuthy's value.

## Example

```yaml
ui:
  display-name: Acme
  icon: /etc/sympauthy/branding/icon.svg
  logo: https://cdn.acme.example/logo.svg
  theme:
    light:
      primary: '#0f766e'
      primary-hover: '#0f645d'
    dark:
      primary: '#84c2ba'
```
