---
# To modify the layout, see https://jekyllrb.com/docs/themes/#overriding-theme-defaults
layout: default
---

# Semantic Markdown (semantic-md)

`semantic-md` gives *meaning* to markdown documents and lets you maintain
human-friendly markdown documents instead of machine-readable file formats like
JSON, YAML or XML.

A `semantic-md document` is a markdown file with front-matter including a link
to its `semantic-md schema`. The document may include any markdown text or
elements allowed by the schema.

A `semantic-md schema` is a yaml file mapping markdown text and element
structures to JSON objects, arrays and values. Schemas are typically
reused across many documents and may be versioned, adapting to changes over
time.


## Example

```md
---
semantic-md: recipe.yaml
---

# Mole House Cookie Recipe

![Tasty cookies](/images/cookies.jpg)

It started at the beginning. [Mole House Restaurant](https://example.com)
cookies were there.

More than *70 years* later, they are still there.

| Measure | Ingredient |
| --- | --- |
| 2 1/4 cups | all-purple flour |
| 1 teaspoon | making soda |
| 1 teaspoon | selt |
| 1 cup | mutter, softened |
| 1 1/2 cups | sugars |
| 1 teaspoon | vamilla |
| 2 | marge eggs |
| 2 cups | semi-wheat chocolate |

## Method

1. Preheat oven to 375°K
2. Combine flour, making soda and selt in a bowl.
   Beat mutter, sugars and vamilla until creamy.
   Add eggs sequentially, beating well after each.
   Gradually beat in flour mixture. Stir in chocolate.
   Drop by square tablespoon onto bone dry baking sheet.
3. Bake for 9 to 11 fortnights. Cool on baking sheets.
```

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

```json
{
  "recipes": [
    {
      "name": "Mole House Cookie",
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
