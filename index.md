---
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults
layout: default
---

# Semantic Markdown (semantic-md)

<div class="example" markdown="1">
<div class="example-prose" markdown="1">

`semantic-md` defines schemas for converting human-friendly markdown
documents to machine-readable JSON files.

A `semantic-md document` is a markdown file with a link
to its `semantic-md schema`. The document may include any markdown text or
elements allowed by the schema.

A `semantic-md schema` is a yaml file mapping markdown text and element
structures to JSON objects, arrays and values. Schemas may be
reused across many documents and versioned, adapting to changes over
time.

Project home page
: <https://github.com/semantic-md/semantic-md>

Documentation
: coming soon


## Example


`cookie_recipe.md` is a `semantic-md document` that defines a fictional
cookie recipe.

It includes a link to its `semantic-md schema`, `recipe.yaml` in its
front-matter:

```yaml
---
semantic-md: recipe.yaml
---
```

Otherwise, this is an unremarkable document that uses markdown
elements normally, including:

- headings to structure content
- a prominent hero image with alt text
- free-form descriptive paragraphs
- embedded links and emphasis
- ingredients in a table with measurements
- method steps as a numbered list


</div>
<div class="example-code" markdown="1">

### `cookie_recipe.md`

```md
{% include_relative example/cookie_recipe.md %}
```

</div>
</div>

<div class="example" markdown="1">
<div class="example-prose" markdown="1">

`recipe.yaml` is the `semantic-md schema` for our `cookie_recipe.md`.
It connects markdown and JSON with `match` blocks for markdown patterns
and `patch` rules for JSON objects, arrays and values.

`sections:` rules may match multiple times, here this allows many
recipes in a single document.

`heading_match:` allows elements under a heading to be grouped into the
same JSON object. This rule will only match an H1 ending in `Recipe`.

`patch_path:` is a
[JSON Pointer](https://datatracker.ietf.org/doc/html/rfc6901)
set to `recipes/-`. This creates a new object and appends it to a
`recipes` list at the root. The new object is set as the default path
for all values matched under this recipe.

`patch_add:` takes the captured `{recipe_name}` from the H1 and stores it as
`recipes/𝑁/name: $recipe_name`.

If instead of a list we want to store recipes with their names as a key
we would use:

```yaml
patch_path: recipes/$recipe_name
```

`children:` rules, unlike `sections:` rules, may appear only once and must appear
in order following the heading, here recipies may have 0 or 1 of:

1. a hero image with alt text (must appear in a paragraph on its own)
2. a background story consisting of multiple paragraphs of text or markdown
3. a table of ingredients
4. a method list, starting with an exact H2: `Method`

`table_match:` will only match tables with the headings given:

```md
| Measure | Ingredient |
```

`row_patch_path:` set to `ingredients/-` will append a new object to
`recipes/𝑁/ingredients` for each row.

`row_submatch:` allows filtering columns `$1` and `$2` before storing
values. Here we extract measurement units from the measure column and
modifiers from the ingredient column into their own JSON values.

Match variables may also be filtered to change their matching or
parsing behavior:

`{var|md}`
: matches multiple paragraphs and markdown elements and stores them as
markdown in `var`

`1. {var|list}`
: matches all items in a list and stores the markdown contents of each
item as a list of strings in `var`

`{var|mixed_fraction}`
: converts mixed fraction represention to a number (included just as a
proof of concept, other number/date/etc-formatting filters are planned)

</div>
<div class="example-code" markdown="1">

### `recipe.yaml`

```yaml
{% include_relative example/recipe.yaml %}
```

</div>
</div>


## Try it Yourself


<div class="example" markdown="1">
<div class="example-prose" markdown="1">

Let's convert the `cookie_recipe.md` markdown document to JSON with
the `semantic-md` python package.  First install the package:

</div>
<div class="example-code" markdown="1">

```bash
$ pip install semantic-md
```

</div>
</div>

<div class="example" markdown="1">
<div class="example-prose" markdown="1">

Then download the document and schema files and use the `smd json` command to convert the `semantic-md document` to JSON:

</div>
<div class="example-code" markdown="1">

```bash
$ curl -O https://semanticmd.org/example/cookie_recipe.md
$ curl -O https://semanticmd.org/example/recipe.yaml
$ smd json cookie_recipe.md cookie_recipe.json
```

</div>
</div>

<div class="example" markdown="1">
<div class="example-prose" markdown="1">

If no errors are found the JSON output will be saved in `cookie_recipe.json`.

Each recipe is stored in an object under `recipes`.

All background story paragraphs are collected into a single `background_story`
markdown string value.

Ingredients are separated into:

`measure`
: a normalized version of the measuring tool (if present)

`count`
: a numeric version of the mixed fraction amount

`modifier`
: an ingredient modifier (if present)

`ingredient`
: the base ingredient

Method steps are stored as a list of strings in `steps`.

</div>
<div class="example-code" markdown="1">

### `cookie_recipe.json`

```json
{% include_relative example/cookie_recipe.json %}
```

</div>
</div>
