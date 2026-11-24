---
layout: documentation
title: Documentation
permalink: /docs/
---

<nav class="docs-toc" aria-label="On this page" markdown="1">
**On this page**

* Contents
{:toc}
</nav>
<!-- end-docs-toc -->

# Documentation
{: .no_toc}

Semantic Markdown uses a YAML schema to match Markdown blocks and build a JSON
object. This reference describes the current implementation.
For a complete working schema and document, see the
[recipe example]({{ '/example/' | relative_url }}).

## Converting Markdown to JSON

Put a `semantic-md` entry in the document's YAML front matter:

```yaml
---
semantic-md: recipe.yaml
---
```

By default, the `smd json` command looks for the schema relative to the input
document. Use `-s SCHEMA` to specify a schema instead, or `-d DIR` to allow
schemas under a particular directory. The command still expects YAML front
matter when `-s` is used.

```bash
smd json recipe.md recipe.json
```

## Converting JSON to Markdown

Use `smd md` to render JSON as Markdown with a schema. Unlike `smd json`, this
command requires the schema to be provided with `-s` (or `--schema`):

```bash
smd md recipe.json recipe.md --schema recipe.yaml
```

The generated Markdown includes YAML front matter pointing to the schema, so it
can be converted back with `smd json`. For a file destination, the schema
reference is relative to that Markdown file; when writing to standard output, it
is an absolute path.

The renderer uses the schema's matching patterns and JSON patch directives to
build the Markdown, then converts the result back to JSON to verify that it
matches the input. Plain text inserted into patterns is escaped. Values captured
with `|md` or `|list`, and values rendered directly into table cells, are treated
as Markdown. Not every JSON value or schema can be rendered, and a schema may
discard source formatting or choose a canonical representation. The generated
Markdown is therefore a valid representation, but is not necessarily identical
to the original document; conversion reports an error if it cannot produce a
Markdown document that passes the JSON check.

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
around the name and filter is allowed. The pattern must match the entire text
node or image URL, including any literal text before and after a capture.

### `heading_match`

`heading_match` is a Markdown pattern for a heading that opens a scope.
It can have `patch_path`, `patch_add`, `children`, and `sections`. Its captures
can be used in its path and patch. Each scope has its own ordered children and
repeating sections, and nested paths are relative to the enclosing scope.

The heading level must match the pattern. Nested scope headings must advance
one level at a time. Headings in ordinary `match` patterns must also match
their specified level.

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

The number and text of the column headings must match the pattern.

## JSON output directives

Paths are relative to the current scope and use
[JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901) segments, without
a leading slash. Missing intermediate objects are created. A trailing `/-`
appends to an array. Captured values substituted into paths have `/` and `~`
escaped as JSON Pointer characters, so they remain within their path segment.

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

Use `{name|filter}` in a pattern. Ordinary captures produce strings; the
implemented filters change what is captured or how it is parsed.

### `md`

Use `{name|md}` as a paragraph on its own in a block `match`. It captures
consecutive supported non-heading blocks, including paragraphs, lists, quotes,
and code blocks, as a Markdown string.

```yaml
match: "{description|md}"
patch_add:
  description: $description
```

### `list`

Use `{name|list}` as the only content of a single list item in a block `match`.
It captures the list as an array of Markdown strings, one per item. For example:

```yaml
match: |
  ## Method

  1. {steps|list}
patch_add:
  steps: $steps
```

The Markdown `1. Mix` followed by `2. Bake` under the Method heading produces
`"steps": ["Mix", "Bake"]`. An unordered list pattern such as
`- {steps|list}` can also be used.

### `mixed_fraction`

Use `{name|mixed_fraction}` in a text capture to convert an integer, fraction,
or mixed fraction to a number. This filter is a proof of concept; invalid input
does not match, so later rules can be tried. If no rule matches, conversion
fails with an unmatched block error; an unmatched table submatch is skipped.

```yaml
match: "{amount|mixed_fraction}"
patch_add:
  count: $amount
```

For example, `2 1/4` produces `"count": 2.25`; `2` and `1/2` also work.
