# European Mythical Creatures Dataset

A comprehensive, structured dataset of 213 mythical creatures from European folklore, mythology, and literature. This resource is designed to support research, education, creative projects, and cultural exploration.

## Features

- **Format:** CSV (see [`data/creatures.csv`](data/creatures.csv))
- **Fields:** ID, Name, Category, Alignment, Latitude, Longitude, Lore
- **Source:** [US National Library of Medicine Dataset Catalog](https://datasetcatalog.nlm.nih.gov/dataset?q=0001572386)

## Table of Contents

- [Data Overview](#data-overview)
- [Sample Entry](#sample-entry)
- [Field Definitions](#field-definitions)
- [How To Use](#how-to-use)
- [Contributing](#contributing)
- [License & Attribution](#license--attribution)

---

## Data Overview

The dataset collects creatures and entities prominent in European traditions, tracing their origins, attributes, and narrative context. Each entry includes categorization, moral alignment, brief lore, and approximate location (when known).

### Categories

- **Anthromorphic:** Human-like beings, spirits, or deities
- **Zoomorphic:** Animal or beast-based creatures
- **Hybrids:** Human-animal or animal-animal chimeras
- **Dragons:** Serpentine, draconic, or mythic reptilian monsters
- **Other:** Nymphs, giants, legendary tribes etc.

---

## Sample Entry

| ID | Name     | Category      | Alignment   | Lat    | Lon   | Lore                                  |
|----|----------|--------------|-------------|--------|-------|---------------------------------------|
| 1  | Ankou    | Anthromorphic| Neutral     | 48.2   | -2.93 | The personification of death who collects souls. |

---

## Field Definitions

| Field      | Description                                            |
|------------|--------------------------------------------------------|
| ID         | Unique numeric code for each creature                  |
| Name       | Common or primary name                                 |
| Category   | Class/type (see above)                                 |
| Alignment  | Benevolent, Malicious, Neutral, Ambivalent             |
| Lat        | Latitude (approx. region of myth’s origin)             |
| Lon        | Longitude (approx. region of myth’s origin)            |
| Lore       | Short descriptive summary                              |

See [`data-dictionary.md`](data-dictionary.md) for details.

---

## How To Use

- Download or clone the repository.
- Load `data/creatures.csv` into your project (works with Excel, pandas, R, etc).
- Use for:
    - Data visualization and mapping
    - World-building for games/fiction
    - Comparative folklore/mythology research
    - Educational/cultural projects

---

## Contributing

Corrections and additions are very welcome!  
To contribute:
1. Fork this repo.
2. Edit or add entries to `data/creatures.csv`.
3. Open a pull request with your changes and sources.

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for details and guidelines.

---

## License & Attribution

- **Data License:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **Source:** [NLM Dataset Catalog](https://datasetcatalog.nlm.nih.gov/dataset?q=0001572386)

Please give attribution if you use, remix, or republish.  
_Cite as: “European Myth_
