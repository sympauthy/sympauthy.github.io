# Collections

Every endpoint of the [Admin API](/technical/api/admin) and the [Client API](/technical/api/client) that returns a
collection returns it one page at a time, and every one of them accepts the same grammar: a page to read, criteria that
narrow it, an order to read it in, and a free text to search it with. What differs between two collections is which
fields they offer, never how a caller spells one.

Each collection of the Admin API also publishes a document saying exactly what it accepts — which of its fields are
filterable, under which operators, which values those fields admit, and what each of those values is called in the
reader's own language. See [Capabilities](#capabilities).

## Response format

A collection response is an object. The items sit under the plural name of what they are, with the paging beside them:

```json
{
  "users": [],
  "page": 0,
  "size": 20,
  "total": 413
}
```

| Field   | Type    | Description                                                       |
|---------|---------|-------------------------------------------------------------------|
| `page`  | integer | The zero-indexed page this response holds.                        |
| `size`  | integer | The number of items per page, which is the one that was asked for. |
| `total` | integer | The number of items the criteria kept, across every page.         |

## Paging

- `page` (optional): Zero-indexed page number — the first page is `0` (default: `0`)
- `size` (optional): Number of results per page. When omitted, the server uses the page size the deployment configured
  in [`advanced.pagination.default-size`](/technical/configuration/advanced#advanced-pagination).

The largest `size` a caller may ask for is
[`advanced.pagination.max-size`](/technical/configuration/advanced#advanced-pagination), which each deployment sets
according to how large its collections are. A `size` above that maximum is refused with a **400 Bad Request** rather
than reduced, so a response never reports a page size other than the one requested.

## Filtering

A bare `field=value` is an exact match. Every other operator is written as a dotted suffix on the field name.

```
GET /api/v1/admin/users
      ?status=enabled
      &email.contains=ana
      &created_at.gte=2026-01-01T00:00:00
```

`email` above is a claim this deployment collects: `/admin/users` offers every enabled claim as a field of its own.

| Operator      | Written                                  | Means                                                |
|---------------|------------------------------------------|------------------------------------------------------|
| `contains`    | `field.contains=`                        | A partial, case-insensitive match.                   |
| `eq`          | `field=` or `field.eq=`                  | The value is exactly this.                           |
| `gt`          | `field.gt=`                              | The value is after this one.                         |
| `gte`         | `field.gte=`                             | The value is this one or after it.                   |
| `in`          | `field.in=a,b,c`                         | The value is one of a comma-separated list.          |
| `is_null`     | `field.is_null=true`                     | The row carries no value for this field.             |
| `lt`          | `field.lt=`                              | The value is before this one.                        |
| `lte`         | `field.lte=`                             | The value is this one or before it.                  |
| `ne`          | `field.ne=`                              | The value is anything but this.                      |
| `starts_with` | `field.starts_with=`                     | A case-insensitive prefix match.                     |

The set is closed and none of these words is localized.

### Which operators a field admits

The operators a field admits are decided by its type, and a field may narrow that set further. A field a row may carry
no value for also admits `is_null`, whatever its type.

| Type                              | Admits                                     |
|-----------------------------------|--------------------------------------------|
| `boolean`                         | `eq` `ne`                                  |
| `enum`, `uuid`, `timezone`        | `eq` `ne` `in`                             |
| `number`, `date`, `date_time`     | `eq` `ne` `lt` `lte` `gt` `gte` `in`       |
| `string`, `email`, `phone_number` | `eq` `ne` `contains` `starts_with`         |

`in` takes a comma-separated list, and a field whose values may hold a comma does not offer it — which is why the text
types are without it.

### Composing criteria

Criteria compose, and they compose with `and`. Two parameters naming one field is how a range is asked for:

```
GET /api/v1/admin/users?created_at.gte=2026-01-01T00:00:00&created_at.lte=2026-06-30T23:59:59
```

There is no `or` and no grouping.

A field reading several values off one row — the claims of a user, the addresses a session was driven from — is
satisfied where any one of them satisfies the criterion. The two operators that ask about an absence are satisfied by
the row rather than by a value: `ne` asks that the row carry no value equal to the one sent, and `is_null` that it
carry none at all.

A value is read as the field's type says, so a date arrives in ISO form and a value over a closed set is matched
ignoring case.

## Ordering

`sort` is a comma-separated list of keys, read left to right, each descending when prefixed with `-`.

```
GET /api/v1/admin/users?sort=-created_at,email
```

This reads the newest first and settles ties by email. A caller who named no key takes the collection's own order,
which each collection publishes as its `default_sort`.

The server ends every order on a key that is unique by construction, ascending, whatever the caller asked for. That key
is not one a caller may name and it is not part of what they sorted by; it is there to decide what their own keys leave
undecided, and it is what makes a walk through the pages total.

::: info There is no `order` parameter
A direction belongs to one key, and cannot be a parameter of its own once there are several. `sort=status&order=desc`
is written `sort=-status`.
:::

## Free text

`q` is a partial, case-insensitive match across the fields the collection names as searchable, and it is spelled `q` on
every collection that has any.

```
GET /api/v1/admin/users?status=enabled&q=ana
```

`q` is a further criterion, so it narrows what the filters kept rather than widening it. A collection that searches
nothing refuses a `q` that arrives rather than ignoring it.

## Errors

Every collection refuses the same things the same way, so a caller who mistyped is told rather than handed a collection
that does not answer what they asked. Any collection endpoint may return **400 Bad Request** with:

| Error code                              | Description                                                                                                                                     |
|-----------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|
| `collection.filter.unknown_field`        | This collection cannot be filtered by the named parameter. The filterable fields are listed in the message.                                     |
| `collection.filter.unsupported_operator` | The named field cannot be filtered with the named operator. The operators it accepts are listed in the message.                                 |
| `collection.filter.value.malformed`      | The value sent is not a valid value of the field's type.                                                                                        |
| `collection.filter.value.unsupported`    | The value sent is not one this server knows for the named filter. The supported values are listed in the message.                               |
| `collection.page.negative`               | The page number must be 0 or greater. The first page is 0.                                                                                      |
| `collection.page.too_large`              | The requested page is beyond the last page that can be addressed with this page size. Request a lower page number.                               |
| `collection.search.unsupported`          | This collection cannot be searched by text. Filter it on one of its fields instead.                                                             |
| `collection.size.too_large`              | The number of results per page must not exceed the server's configured maximum. Request fewer results per page and page through the collection.  |
| `collection.size.too_small`              | The number of results per page must be 1 or greater.                                                                                            |
| `collection.sort.unknown_field`          | This collection cannot be ordered by the named key. The sortable fields are listed in the message.                                              |

Each description names the parameter, the field or the value at fault, and `collection.size.too_large` names the
configured maximum, so the message a caller receives states the actual number.

`page`, `size`, `sort` and `q` are reserved on every collection. A collection reading a parameter of its own for
something other than a criterion — `/admin/users`'s `claims`, which selects what is published rather than what is
kept — reserves that name too.

## Capabilities

Every collection of the Admin API publishes what it accepts at `capabilities` under its own path, gated by the same
scope that gates the collection it describes.

```
GET /api/v1/admin/users/capabilities
GET /api/v1/admin/users/{user_id}/claims/capabilities
```

**Response Format**:

```json
{
  "search": {
    "fields": ["email", "name"]
  },
  "filters": [
    {
      "field": "status",
      "name": "Status",
      "type": "enum",
      "operators": ["eq", "ne", "in"],
      "values": [
        { "value": "enabled", "name": "Enabled" },
        { "value": "disabled", "name": "Disabled" }
      ]
    },
    {
      "field": "created_at",
      "name": "Creation date",
      "type": "date_time",
      "operators": ["eq", "ne", "lt", "lte", "gt", "gte", "in"]
    }
  ],
  "sorts": [
    { "field": "created_at", "name": "Creation date" },
    { "field": "status", "name": "Status" }
  ],
  "default_sort": "created_at"
}
```

| Field          | Type   | Description                                                                                                                     |
|----------------|--------|---------------------------------------------------------------------------------------------------------------------------------|
| `default_sort` | string | The order the collection takes when the caller names none, spelled the way `sort` is, prefix included. Absent where it has none. |
| `filters`      | array  | The fields the collection filters on, each with the operators it admits.                                                        |
| `search`       | object | The wire names of the fields `q` matches against. Absent where the collection answers no `q` at all.                            |
| `sorts`        | array  | The fields the collection orders on, which are the keys `sort` accepts.                                                         |

Each entry of `filters` carries the `field` name it is sent under, the `name` it is read under, its `type`, the
`operators` it admits, and — where its set is closed — the `values` it holds, each with its own name.

The document answers for exactly what the collection beside it accepts: a field absent from it is a field the
collection refuses, and a field present in it is one the collection admits under every operator it lists. This is what
makes the errors above a contract rather than a surprise.

### Why it is a request rather than a constant

The set a field enumerates is this deployment's, not the build's. The claims this deployment configured, the clients it
declares, the audiences and the scopes it serves are values a generated OpenAPI document cannot know — so a console
that reads this document can render a filter on a claim it was never built knowing about.

### Names and languages

`name` is read in the language the request asked for through the `Accept-Language` header, and it may be reworded in
any release — so nothing may branch on it. The `field`, `type` and `operator` words are the wire contract and are never
localized.

A field that is something this deployment configured is named by that thing's own key, so a deployment that named a
claim once has named it here too. Where no translation exists, the name falls back to the word the thing is already
known by: the field's own wire name, the value's own spelling, or the name this deployment gave it.

::: warning `capabilities` is a reserved identifier
On every collection whose items are named by a string — a claim, a client, an audience or a scope — a configured item
named `capabilities` would be unreachable through its own item route. The server refuses such a configuration rather
than leaving a deployment with a row it cannot read.
:::

### The Client API publishes none

The grammar binds the Client API's collections like everything else, but they publish no capability document: what
reads that surface is generated from the published OpenAPI specification, and the values it filters on belong to the
one client asking. The fields each of them accepts are documented on the [Client API](/technical/api/client) page.

## Not covered

- **`or` and grouping.** Criteria compose with `and` only.
- **Choosing which fields come back.** `/admin/users`'s `claims` parameter selects what is published rather than what
  is kept, and it is not a criterion.
- **Cursor paging.** `page` and `size` stay, with the bounds a deployment configures.
- **Saved or shareable filters.** Nothing stores a set of criteria under a name.
