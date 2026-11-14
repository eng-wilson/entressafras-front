// Respostas reais reduzidas, verificadas em 14/11/2026. Uso exclusivo em testes.
import type { CropDetail } from '../types'

export const CULTURAS_FIXTURE: CropDetail[] = [
  {
    "eco_port_code": 1150,
    "scientific_name": "Glycine max",
    "temperature": {
      "optimal_min": 20,
      "optimal_max": 33,
      "absolute_min": 10,
      "absolute_max": 38,
      "killing_rest": null,
      "killing_early_growth": null
    },
    "rainfall": {
      "optimal_min": 600,
      "optimal_max": 1500,
      "absolute_min": 450,
      "absolute_max": 1800
    },
    "soil_ph": {
      "optimal_min": 5.5,
      "optimal_max": 6.5,
      "absolute_min": 4.5,
      "absolute_max": 8.4
    },
    "crop_cycle": {
      "min_days": 75,
      "max_days": 180
    },
    "soil": {
      "depth": {
        "optimal": [
          "medium (50-150 cm)"
        ],
        "absolute": [
          "shallow (20-50 cm)"
        ]
      },
      "texture": {
        "optimal": [
          "medium",
          "organic"
        ],
        "absolute": [
          "heavy",
          "medium",
          "light"
        ]
      },
      "fertility": {
        "optimal": [
          "high"
        ],
        "absolute": [
          "low"
        ]
      },
      "al_toxicity": {
        "optimal": [],
        "absolute": []
      },
      "salinity": {
        "optimal": [
          "low (<4 dS/m)"
        ],
        "absolute": [
          "medium (4-10 dS/m)"
        ]
      },
      "drainage": {
        "optimal": [
          "well (dry spells)"
        ],
        "absolute": [
          "poorly (saturated >50% of year)",
          "well (dry spells)",
          "excessive (dry/moderately dry)"
        ]
      }
    }
  },
  {
    "eco_port_code": 2175,
    "scientific_name": "Zea mays",
    "temperature": {
      "optimal_min": 18,
      "optimal_max": 33,
      "absolute_min": 10,
      "absolute_max": 47,
      "killing_rest": null,
      "killing_early_growth": null
    },
    "rainfall": {
      "optimal_min": 600,
      "optimal_max": 1200,
      "absolute_min": 400,
      "absolute_max": 1800
    },
    "soil_ph": {
      "optimal_min": 5,
      "optimal_max": 7,
      "absolute_min": 4.5,
      "absolute_max": 8.5
    },
    "crop_cycle": {
      "min_days": 65,
      "max_days": 365
    },
    "soil": {
      "depth": {
        "optimal": [
          "medium (50-150 cm)"
        ],
        "absolute": [
          "shallow (20-50 cm)"
        ]
      },
      "texture": {
        "optimal": [],
        "absolute": []
      },
      "fertility": {
        "optimal": [
          "high"
        ],
        "absolute": [
          "low"
        ]
      },
      "al_toxicity": {
        "optimal": [],
        "absolute": []
      },
      "salinity": {
        "optimal": [
          "low (<4 dS/m)"
        ],
        "absolute": [
          "medium (4-10 dS/m)"
        ]
      },
      "drainage": {
        "optimal": [],
        "absolute": []
      }
    }
  },
  {
    "eco_port_code": 536,
    "scientific_name": "Brachiaria brizantha",
    "temperature": {
      "optimal_min": 25,
      "optimal_max": 35,
      "absolute_min": 15,
      "absolute_max": 38,
      "killing_rest": null,
      "killing_early_growth": null
    },
    "rainfall": {
      "optimal_min": 750,
      "optimal_max": 2500,
      "absolute_min": 500,
      "absolute_max": 4000
    },
    "soil_ph": {
      "optimal_min": 5,
      "optimal_max": 6,
      "absolute_min": 4.5,
      "absolute_max": 7
    },
    "crop_cycle": {
      "min_days": 90,
      "max_days": 300
    },
    "soil": {
      "depth": {
        "optimal": [
          "shallow (20-50 cm)"
        ],
        "absolute": [
          "shallow (20-50 cm)"
        ]
      },
      "texture": {
        "optimal": [
          "heavy",
          "medium",
          "light"
        ],
        "absolute": [
          "heavy",
          "medium",
          "light"
        ]
      },
      "fertility": {
        "optimal": [
          "moderate"
        ],
        "absolute": [
          "low"
        ]
      },
      "al_toxicity": {
        "optimal": [],
        "absolute": []
      },
      "salinity": {
        "optimal": [
          "low (<4 dS/m)"
        ],
        "absolute": [
          "low (<4 dS/m)"
        ]
      },
      "drainage": {
        "optimal": [
          "well (dry spells)"
        ],
        "absolute": [
          "well (dry spells)",
          "excessive (dry/moderately dry)"
        ]
      }
    }
  },
  {
    "eco_port_code": 801,
    "scientific_name": "Crotalaria juncea",
    "temperature": {
      "optimal_min": 20,
      "optimal_max": 30,
      "absolute_min": 4,
      "absolute_max": 40,
      "killing_rest": -2,
      "killing_early_growth": -1
    },
    "rainfall": {
      "optimal_min": 500,
      "optimal_max": 1500,
      "absolute_min": 200,
      "absolute_max": 4300
    },
    "soil_ph": {
      "optimal_min": 6,
      "optimal_max": 7,
      "absolute_min": 5,
      "absolute_max": 8.4
    },
    "crop_cycle": {
      "min_days": 60,
      "max_days": 160
    },
    "soil": {
      "depth": {
        "optimal": [
          "medium (50-150 cm)"
        ],
        "absolute": [
          "medium (50-150 cm)"
        ]
      },
      "texture": {
        "optimal": [
          "medium"
        ],
        "absolute": [
          "medium",
          "light"
        ]
      },
      "fertility": {
        "optimal": [
          "moderate"
        ],
        "absolute": [
          "low"
        ]
      },
      "al_toxicity": {
        "optimal": [],
        "absolute": []
      },
      "salinity": {
        "optimal": [
          "low (<4 dS/m)"
        ],
        "absolute": [
          "medium (4-10 dS/m)"
        ]
      },
      "drainage": {
        "optimal": [
          "well (dry spells)"
        ],
        "absolute": [
          "well (dry spells)",
          "excessive (dry/moderately dry)"
        ]
      }
    }
  }
]
