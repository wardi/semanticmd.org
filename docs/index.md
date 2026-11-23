---
layout: default
title: Documentation
permalink: /docs/
---

# Schema directive reference

Semantic Markdown uses a YAML schema to match Markdown blocks and build a JSON
object. This reference describes the current implementation, version 0.0.2.
For a complete working schema and document, see the
[recipe example]({{ '/example/' | relative_url }}).

## Using a schema

Put a `semantic-md` entry in the document's YAML front matter:

```yaml
---
semantic-md: recipe.yaml
---
```

By default, the `smd json` command looks for the schema relative to the input
document. Use `-s SCHEMA` to specify a schema instead, or `-d DIR` to allow
schemas under a particular directory. The command still expects YAML front
matter when `-s` is used. HTTP schema loading is not implemented.

```bash
smd json recipe.md recipe.json
```

The schema's top level may contain `children` and `sections`, each a list of
rules. A rule has one of `match`, `heading_match`, or `table_match`; each
kind supports the associated directives described below. An unmatched Markdown
block causes conversion to fail.

## Rule ordering: `children` and `sections`

- `children` rules are tried in order and each can match at most once.
  When a later child matches, earlier unmatched children are skipped. A child
  can therefore be omitted, but cannot appear later out of order.
- `sections` rules are tried after the children and can match repeatedly.
  A matching section is normally a `heading_match` that opens a nested scope.
- Both lists can appear at the schema root and under a `heading_match`.
  The nested scope ends when a heading at the same or a higher level is
  encountered. Headings that open scopes must progress one level at a time.

The current implementation requires every `heading_match` to have a nonempty
`children` list, even if its children are omitted from a particular document.
Omitting the list or using an empty list causes conversion to fail.

```yaml
sections:
  - heading_match: "# Item {id}"
    patch_path: items/$id
    children:
      - match: "{description|md}"
        patch_add:
          description: $description
```

This collects repeated item sections into objects under `items`, keyed by the
captured `id`. The description child is optional and appears at most once per
item.

## Matching directives

### `match`

`match` is a Markdown pattern. The implementation parses it as Markdown and
compares its block and inline structure with the document. Literal text and
formatting form the pattern; `{name}` captures text from a matching text node
or image URL. `patch_add` writes the captured values to JSON.

```yaml
children:
  - match: |
      ![{alt}]({url})
    patch_add:
      image_alt: $alt
      image_url: $url
```

Capture names use lowercase letters, digits, and underscores. Whitespace
around the name and filter is allowed. Literal text matching is currently
prefix-based rather than an exact full-string comparison; do not rely on it
to reject trailing text.

### `heading_match`

`heading_match` is a Markdown pattern for a heading that opens a scope.
It can have `patch_path`, `patch_add`, `children`, and `sections`. Its captures
can be used in its path and patch. Each scope has its own ordered children and
repeating sections, and nested paths are relative to the enclosing scope.

Use the appropriate heading level in the pattern and document; the current
implementation requires nested scope headings to advance one level at a time.
Do not rely on the matcher to reject a heading solely because its level differs
from the pattern.

### `table_match`

`table_match` is a list of column headings. On a matched table, the directives
`row_patch_path`, `row_patch_add`, and `row_submatch` operate on each body row.
Column values are available as `$1`, `$2`, and so on, in column order. Cells
are rendered as Markdown strings.

```yaml
children:
  - table_match: [Name, Label]
    row_patch_add:
      columns/$1/label: $2
```

**Current limitation:** the implementation checks the number of columns but
does not reliably reject tables with different header text. Use distinct table
shapes and rule ordering rather than relying on header names for validation.

## JSON output directives

Paths are relative to the current scope and use
[JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901) segments, without
a leading slash. Missing intermediate objects are created. A trailing `/-`
appends to an array. Captured values substituted into paths are not
automatically escaped as JSON Pointer segments; avoid `/` and `~` in those
values.

### `patch_path`

On a `heading_match`, `patch_path` selects the output location for the heading
and its nested rules. A path ending in `/-` appends a new object and makes that
object the scope. Without `patch_path`, the enclosing scope is used.

```yaml
sections:
  - heading_match: "# Recipe {name}"
    patch_path: recipes/-
    patch_add:
      name: $name
    children:
      - match: "Description: {description}"
        patch_add:
          description: $description
```

### `patch_add`

On `match`, `heading_match`, or a row submatch rule, `patch_add` maps relative
paths to values to add using JSON Patch's `add` operation. A value that is
exactly `$name` is replaced by the corresponding capture; substitution also
works within nested YAML lists and objects. Literal values such as `true`,
numbers, and strings remain literal. In paths, `$name` is substituted within
the path.

```yaml
patch_add:
  name: $name
  metadata: {source: "recipe", featured: true}
```

Value substitution is for whole values, not string interpolation: `"Hello
$name"` is a literal string. An existing object member at an added path is
replaced.

### `row_patch_path` and `row_patch_add`

On `table_match`, `row_patch_path` selects a relative scope for each row.
Ending it with `/-` appends a new object per row. `row_patch_add` adds values
once per row, relative to that scope. Both paths and values can use the
numbered column variables.

```yaml
table_match: [Name, Label]
row_patch_path: columns/-
row_patch_add:
  name: $1
  label: $2
```

The same row scope is used by `row_submatch`. Without `row_patch_path`, row
patches use the enclosing heading's scope.

### `row_submatch`

`row_submatch` maps a column reference such as `$1` to an ordered list of
submatch rules. It processes each cell after `row_patch_add`. Submatches have
their own `match` or `filter_match` and optional `patch_add`; their patches
can also use the numbered variables for the whole row. A nonmatching
submatch is skipped. A successful `match` stops processing that column's
rules; successful filters can continue to subsequent rules.

```yaml
table_match: [Type]
row_submatch:
  $1:
    - filter_match: "required {content}"
      patch_add:
        required: true
    - match: "{type}"
      patch_add:
        type: $type
```

For `required integer`, this writes `required: true` and `type: integer`.
For `integer`, the filter is skipped and the `match` captures the original
cell. A column with no matching submatch does not itself cause an error.

### `filter_match`

`filter_match` is available only inside `row_submatch`. Its inline Markdown
pattern must capture `{content}`. When it matches, captures other than
`content` can be used by its `patch_add`, and the captured content becomes the
input for the remaining rules for that column.

It also accepts `singular` and `plural` patterns. Both must capture the same
variables, including `content`. The singular pattern is accepted only when
its `content` is exactly `1`; otherwise the plural pattern is tried.

```yaml
filter_match:
  singular: "{content} cup"
  plural: "{content} cups"
patch_add:
  measure: cup
```

## Capture filters

Use `{name|filter}` in a pattern. The implemented filters are:

| Filter | Usage | Result |
| --- | --- | --- |
| `md` | A paragraph containing only `{name|md}` in a block `match` | A Markdown string containing consecutive supported non-heading blocks, including paragraphs, lists, quotes and code blocks. |
| `list` | A single list item containing only `{name|list}`, for example `- {name|list}` or `1. {name|list}` | A list of Markdown strings, one per item. |
| `mixed_fraction` | A text capture such as `{amount|mixed_fraction}` | A number parsed from an integer, fraction, or mixed fraction, such as `2`, `1/2`, or `2 1/4`. Invalid input fails conversion. |

`md` and `list` have special structural meanings, so use them in the forms
shown above rather than embedding them in other text. Ordinary captures produce
strings; `mixed_fraction` is a proof-of-concept numeric filter.
Currently, an `md` capture at the end of a document can leave its last block
unmatched and cause conversion to fail. Place a following heading or another
non-`md` block after the captured content.

## Version metadata

Some schemas contain `semantic-md-version: 0`. The current parser does not
read or enforce this field; it is not a version compatibility check.
