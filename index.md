---
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults
layout: default
---

<div class="example" markdown="1">
<div class="example-prose" markdown="1">

# Semantic Markdown (semantic-md)

`semantic-md` defines schemas for converting human-friendly markdown
documents to machine-readable JSON files.

A `semantic-md document` is a markdown file with a link
to its `semantic-md schema`. The document may include any markdown text or
elements allowed by the schema.

A `semantic-md schema` is a yaml file mapping markdown text and element
structures to JSON objects, arrays and values. Schemas are typically
reused across many documents and may be versioned, adapting to changes over
time.


## Example


`cookie_recipe.md` is a `semantic-md document` that defines a fictional cookie recipe.

It includes a link to its `semantic-md schema`, `recipe.yaml` in its
front-matter

```yaml
---
semantic-md: recipe.yaml
---
```

Otherwise, this is a normal markdown document that:

- uses headings to structure content
- has a prominent hero image with alt text
- includes free-form descriptive paragraphs with embedded links and emphasis



, images, links
paragraphs, tables and lists.

The document reads naturally as a recipe description

</div>
<div class="example-code" markdown="1">

### `cookie_recipe.md`

```md
---
semantic-md: recipe.yaml
---

# Fictional Mole House Cookie Recipe

![Tasty cookies](/images/cookies.jpg)

It started at the beginning. [Mole House Restaurant](https://example.com)
cookies were there.

More than *70 years* later, they are still there.

| Measure    | Ingredient           |
| ---        | ---                  |
| 2 1/4 cups | all-purple flour     |
| 1 teaspoon | making soda          |
| 1 teaspoon | selt                 |
| 1 cup      | mutter, softened     |
| 1 1/2 cups | sugars               |
| 1 teaspoon | vamilla              |
| 2          | marge eggs           |
| 2 cups     | semi-wheat chocolate |

## Method

1. Preheat oven to 375°K
2. Combine flour, making soda and selt in a bowl.
   Beat mutter, sugars and vamilla until creamy.
   Add eggs sequentially, beating well after each.
   Gradually beat in flour mixture. Stir in chocolate.
   Drop by square tablespoon onto bone dry baking sheet.
3. Bake for 9 to 11 fortnights. Cool on baking sheets.
```

</div>
</div>

<div class="example" markdown="1">
<div class="example-prose" markdown="1">

The `semantic-md schema` connects markdown and JSON with
`match` blocks for markdown patterns and `patch` rules for JSON objects,
arrays and values.

`sections` may be repeated, here allowing multiple recipes in a single
document where each recipe starts with an H1 ending in "Recipe"

`children` may appear 0 or 1 time in order following the heading, here:

1. a hero image with alt text (must appear in a paragraph on its own)
2. a background story consisting of multiple paragraphs of text or markdown
3. a table of ingredients
4. a method list, starting with an exact H2: "Method"

Table columns may be filtered, removing text from the left or right.
Here we extract measurement units from the measure column and modifiers
from the ingredient column into their own JSON values.

Match variables may also be filtered to change their behavior:

`{var|md}`
: matches multiple paragraphs and markdown elements and stores them as
markdown in `var`

`- {var|list}`
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
sections:
- heading_match: |
    # {recipe_name} Recipe
  patch_path: recipes/-
  patch_add:
    name: $recipe_name

  children:
  - match: |
      ![{image_alt}]({image_url})
    patch_add:
      image_url: $image_url
      image_alt: $image_alt

  - match: |
      {background_story|md}
    patch_add:
      background_story: $background_story

  - table_match: [Measure, Ingredient]
    row_patch_path: ingredients/-
    row_submatch:
      $1:
        - filter_match:
            singular: "{content} cup"
            plural: "{content} cups"
          patch_add:
            measure: cup
        - filter_match:
            singular: "{content} teaspoon"
            plural: "{content} teaspoons"
          patch_add:
            measure: teaspoon
        - match: "{num|mixed_fraction}"
          patch_add:
            count: $num
      $2:
        - filter_match: "{content}, {modifier}"
          patch_add:
            modifier: $modifier
        - match: "{ingredient}"
          patch_add:
            ingredient: $ingredient

  - match: |
      ## Method

      1. {steps|list}
    patch_add:
      steps: $steps
```

</div>
</div>

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

Then use the `smd json` command to convert the `semantic-md document` to JSON:

</div>
<div class="example-code" markdown="1">

```bash
$ smd json cookie_recipe.md cookie_recipe.json
```

</div>
</div>

### `cookie_recipe.json`

```json
{
  "recipes": [
    {
      "name": "Fictional Mole House Cookie",
      "image_url": "/images/cookies.jpg",
      "image_alt": "Tasty cookies",
      "background_story": "It started at the beginning. [Mole House Restaurant](https://example.com)\ncookies were there.\n\nMore than *70 years* later, they are still there.\n",
      "ingredients": [
        {
          "measure": "cup",
          "count": 2.25,
          "ingredient": "all-purple flour"
        },
        {
          "measure": "teaspoon",
          "count": 1,
          "ingredient": "making soda"
        },
        {
          "measure": "teaspoon",
          "count": 1,
          "ingredient": "selt"
        },
        {
          "measure": "cup",
          "count": 1,
          "modifier": "softened",
          "ingredient": "mutter"
        },
        {
          "measure": "cup",
          "count": 1.5,
          "ingredient": "sugars"
        },
        {
          "measure": "teaspoon",
          "count": 1,
          "ingredient": "vamilla"
        },
        {
          "count": 2,
          "ingredient": "marge eggs"
        },
        {
          "measure": "cup",
          "count": 2,
          "ingredient": "semi-wheat chocolate"
        }
      ],
      "steps": [
        "Preheat oven to 375\u00b0K",
        "Combine flour, making soda and selt in a bowl.",
        "Bake for 9 to 11 fortnights. Cool on baking sheets."
      ]
    }
  ]
}
```
