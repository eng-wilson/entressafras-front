// Resposta REAL de POST /api/rotations/recommendations em 15/11/2026 (T-07, Sorriso/MT; argiloso, histórico
// soja → milho; prioridades: segurança hídrica e proteção do solo). Reduzida aos campos que o front usa.
// Primeira resposta com risco calculado (method FAO56_SIMPLIFIED_KY, 30 safras), sem MOCK. Uso exclusivo em testes.
import type { RotationRecommendations } from '../types'

export const ROTACOES_REAL_FIXTURE: RotationRecommendations = {
  "agricultural_year": 2027,
  "soil_type": "clayey",
  "soil": {
    "source": "REQUEST_TEXTURE_CLASS",
    "texture_class": "clayey",
    "available_water_mm_per_m": 160,
    "sand_pct": null,
    "silt_pct": null,
    "clay_pct": null,
    "organic_matter_pct": null,
    "field_capacity": null,
    "wilting_point": null,
    "sampled_location": null,
    "distance_km": null
  },
  "soil_properties": {
    "source": "SOILGRIDS",
    "depth": "0-30cm",
    "organic_carbon_g_per_kg": 13.2,
    "sand_pct": 56.5,
    "silt_pct": 18.9,
    "clay_pct": 24.7,
    "texture_class": "medium",
    "sampled_location": {
      "lat": -12.5249,
      "lon": -55.717
    },
    "distance_km": 2
  },
  "priorities": {
    "productivity": 0,
    "water_security": 1,
    "soil_protection": 1,
    "revenue": 0
  },
  "rotations": [
    {
      "id": "2153-1191-2027-10-11",
      "rank": 1,
      "crops": [
        {
          "crop": {
            "eco_port_code": 2153,
            "scientific_name": "Vigna unguiculata",
            "common_names": [
              "cow pea",
              "cowpea",
              "southern pea (USA)"
            ],
            "water_requirements": {
              "profile": "FAO-PULSES",
              "profile_name": "Pulses",
              "crop_coefficient": {
                "initial": 0.4,
                "mid_season": 1.15,
                "late_season": 0.35
              },
              "stage_length_days": {
                "initial": 20,
                "development": 30,
                "mid_season": 40,
                "late_season": 20,
                "total": 110
              },
              "root_depth_m": {
                "initial": 0.3,
                "max": 1
              },
              "allowable_depletion": {
                "initial": 0.6,
                "mid_season": 0.6,
                "late_season": 0.8
              },
              "yield_response_factor": {
                "initial": 0.4,
                "development": 0.6,
                "mid_season": 0.8,
                "late_season": 0.6,
                "season": 0.8
              },
              "max_height_m": 0.4
            },
            "risk": {
              "risk_percentage": 0,
              "estimated_yield_loss_pct": 0.6,
              "loss_threshold_pct": 20,
              "critical_stage": "initial",
              "mean_isna": {
                "initial": 0.928,
                "development": 0.998,
                "mid_season": 0.999,
                "late_season": 0.999
              },
              "mean_season_isna": 0.993,
              "valid_years": 30,
              "method": "FAO56_SIMPLIFIED_KY",
              "validated": false
            }
          },
          "planting_date": "2027-10-11",
          "harvest_date": "2028-01-28",
          "calendar": {
            "source": "FAO56_REFERENCE",
            "cycle_days": 110,
            "reference_planting_date": null,
            "data_source": null,
            "grid_cell": null
          }
        },
        {
          "crop": {
            "eco_port_code": 1191,
            "scientific_name": "Helianthus annuus",
            "common_names": [
              "sunflower",
              "Italian girasole",
              "cut-and-come-again"
            ],
            "water_requirements": {
              "profile": "FAO-SUNFLOWR",
              "profile_name": "Sunflower",
              "crop_coefficient": {
                "initial": 0.35,
                "mid_season": 1.15,
                "late_season": 0.35
              },
              "stage_length_days": {
                "initial": 24,
                "development": 33,
                "mid_season": 42,
                "late_season": 23,
                "total": 122
              },
              "root_depth_m": {
                "initial": 0.3,
                "max": 1.3
              },
              "allowable_depletion": {
                "initial": 0.45,
                "mid_season": 0.5,
                "late_season": 0.8
              },
              "yield_response_factor": {
                "initial": 0.4,
                "development": 0.6,
                "mid_season": 0.8,
                "late_season": 0.8,
                "season": 0.95
              },
              "max_height_m": 2
            },
            "risk": {
              "risk_percentage": 0,
              "estimated_yield_loss_pct": 1.6,
              "loss_threshold_pct": 20,
              "critical_stage": "late_season",
              "mean_isna": {
                "initial": 0.995,
                "development": 1,
                "mid_season": 0.987,
                "late_season": 0.937
              },
              "mean_season_isna": 0.983,
              "valid_years": 30,
              "method": "FAO56_SIMPLIFIED_KY",
              "validated": false
            }
          },
          "planting_date": "2028-02-03",
          "harvest_date": "2028-06-03",
          "calendar": {
            "source": "GGCMI_PHASE3_V1_01",
            "cycle_days": 122,
            "reference_planting_date": "2028-02-29",
            "data_source": "Brazil CONAB",
            "grid_cell": {
              "lat": -12.75,
              "lon": -55.75
            }
          }
        }
      ],
      "soil_protection": {
        "score": 74,
        "living_cover_days": 232,
        "season_days": 366,
        "cover_fraction": 0.634,
        "family_change_fraction": 1,
        "transitions": 3,
        "family_changes": 3,
        "botanical_families": [
          "Fabaceae",
          "Poaceae",
          "Asteraceae"
        ],
        "includes_history": true,
        "weights": {
          "cover": 70,
          "diversity": 30
        },
        "method": "PLANNED_COVER_DIVERSITY_V1",
        "validated": false
      },
      "scores": {
        "productivity": 98.4,
        "water_security": 100,
        "soil_protection": 74.4,
        "overall": 90.9,
        "aggregation": "WORST_CROP"
      }
    },
    {
      "id": "2153-48747-2027-10-31",
      "rank": 2,
      "crops": [
        {
          "crop": {
            "eco_port_code": 2153,
            "scientific_name": "Vigna unguiculata",
            "common_names": [
              "cow pea",
              "cowpea",
              "southern pea (USA)"
            ],
            "water_requirements": {
              "profile": "FAO-PULSES",
              "profile_name": "Pulses",
              "crop_coefficient": {
                "initial": 0.4,
                "mid_season": 1.15,
                "late_season": 0.35
              },
              "stage_length_days": {
                "initial": 20,
                "development": 30,
                "mid_season": 40,
                "late_season": 20,
                "total": 110
              },
              "root_depth_m": {
                "initial": 0.3,
                "max": 1
              },
              "allowable_depletion": {
                "initial": 0.6,
                "mid_season": 0.6,
                "late_season": 0.8
              },
              "yield_response_factor": {
                "initial": 0.4,
                "development": 0.6,
                "mid_season": 0.8,
                "late_season": 0.6,
                "season": 0.8
              },
              "max_height_m": 0.4
            },
            "risk": {
              "risk_percentage": 0,
              "estimated_yield_loss_pct": 0.2,
              "loss_threshold_pct": 20,
              "critical_stage": "initial",
              "mean_isna": {
                "initial": 0.993,
                "development": 1,
                "mid_season": 0.999,
                "late_season": 0.994
              },
              "mean_season_isna": 0.998,
              "valid_years": 30,
              "method": "FAO56_SIMPLIFIED_KY",
              "validated": false
            }
          },
          "planting_date": "2027-10-31",
          "harvest_date": "2028-02-17",
          "calendar": {
            "source": "FAO56_REFERENCE",
            "cycle_days": 110,
            "reference_planting_date": null,
            "data_source": null,
            "grid_cell": null
          }
        },
        {
          "crop": {
            "eco_port_code": 48747,
            "scientific_name": "Sorghum bicolor",
            "common_names": [
              "bachanta",
              "broom-corn",
              "chicken corn"
            ],
            "water_requirements": {
              "profile": "FAO-SORGHUM",
              "profile_name": "SORGHUM (Grain)",
              "crop_coefficient": {
                "initial": 0.3,
                "mid_season": 1,
                "late_season": 0.55
              },
              "stage_length_days": {
                "initial": 19,
                "development": 34,
                "mid_season": 39,
                "late_season": 29,
                "total": 121
              },
              "root_depth_m": {
                "initial": 0.3,
                "max": 1.4
              },
              "allowable_depletion": {
                "initial": 0.6,
                "mid_season": 0.5,
                "late_season": 0.8
              },
              "yield_response_factor": {
                "initial": 0.2,
                "development": 0.4,
                "mid_season": 0.55,
                "late_season": 0.2,
                "season": 0.9
              },
              "max_height_m": 1.5
            },
            "risk": {
              "risk_percentage": 0,
              "estimated_yield_loss_pct": 2.1,
              "loss_threshold_pct": 20,
              "critical_stage": "late_season",
              "mean_isna": {
                "initial": 1,
                "development": 0.999,
                "mid_season": 0.985,
                "late_season": 0.926
              },
              "mean_season_isna": 0.977,
              "valid_years": 30,
              "method": "FAO56_SIMPLIFIED_KY",
              "validated": false
            }
          },
          "planting_date": "2028-02-23",
          "harvest_date": "2028-06-22",
          "calendar": {
            "source": "GGCMI_PHASE3_V1_01",
            "cycle_days": 121,
            "reference_planting_date": "2028-03-16",
            "data_source": "Brazil CONAB",
            "grid_cell": {
              "lat": -12.75,
              "lon": -55.75
            }
          }
        }
      ],
      "soil_protection": {
        "score": 74,
        "living_cover_days": 231,
        "season_days": 366,
        "cover_fraction": 0.631,
        "family_change_fraction": 1,
        "transitions": 3,
        "family_changes": 3,
        "botanical_families": [
          "Fabaceae",
          "Poaceae"
        ],
        "includes_history": true,
        "weights": {
          "cover": 70,
          "diversity": 30
        },
        "method": "PLANNED_COVER_DIVERSITY_V1",
        "validated": false
      },
      "scores": {
        "productivity": 97.9,
        "water_security": 100,
        "soil_protection": 74.2,
        "overall": 90.7,
        "aggregation": "WORST_CROP"
      }
    },
    {
      "id": "2153-2175-2027-10-01",
      "rank": 3,
      "crops": [
        {
          "crop": {
            "eco_port_code": 2153,
            "scientific_name": "Vigna unguiculata",
            "common_names": [
              "cow pea",
              "cowpea",
              "southern pea (USA)"
            ],
            "water_requirements": {
              "profile": "FAO-PULSES",
              "profile_name": "Pulses",
              "crop_coefficient": {
                "initial": 0.4,
                "mid_season": 1.15,
                "late_season": 0.35
              },
              "stage_length_days": {
                "initial": 20,
                "development": 30,
                "mid_season": 40,
                "late_season": 20,
                "total": 110
              },
              "root_depth_m": {
                "initial": 0.3,
                "max": 1
              },
              "allowable_depletion": {
                "initial": 0.6,
                "mid_season": 0.6,
                "late_season": 0.8
              },
              "yield_response_factor": {
                "initial": 0.4,
                "development": 0.6,
                "mid_season": 0.8,
                "late_season": 0.6,
                "season": 0.8
              },
              "max_height_m": 0.4
            },
            "risk": {
              "risk_percentage": 0,
              "estimated_yield_loss_pct": 1.8,
              "loss_threshold_pct": 20,
              "critical_stage": "initial",
              "mean_isna": {
                "initial": 0.851,
                "development": 0.985,
                "mid_season": 0.99,
                "late_season": 1
              },
              "mean_season_isna": 0.978,
              "valid_years": 30,
              "method": "FAO56_SIMPLIFIED_KY",
              "validated": false
            }
          },
          "planting_date": "2027-10-01",
          "harvest_date": "2028-01-18",
          "calendar": {
            "source": "FAO56_REFERENCE",
            "cycle_days": 110,
            "reference_planting_date": null,
            "data_source": null,
            "grid_cell": null
          }
        },
        {
          "crop": {
            "eco_port_code": 2175,
            "scientific_name": "Zea mays",
            "common_names": [
              "maize",
              "corn",
              "Mais"
            ],
            "water_requirements": {
              "profile": "FAO-MAIZE",
              "profile_name": "MAIZE (Grain)",
              "crop_coefficient": {
                "initial": 0.3,
                "mid_season": 1.2,
                "late_season": 0.35
              },
              "stage_length_days": {
                "initial": 19,
                "development": 32,
                "mid_season": 37,
                "late_season": 28,
                "total": 116
              },
              "root_depth_m": {
                "initial": 0.3,
                "max": 1
              },
              "allowable_depletion": {
                "initial": 0.55,
                "mid_season": 0.55,
                "late_season": 0.8
              },
              "yield_response_factor": {
                "initial": 0.4,
                "development": 0.4,
                "mid_season": 1.3,
                "late_season": 0.5,
                "season": 1.25
              },
              "max_height_m": 2
            },
            "risk": {
              "risk_percentage": 0,
              "estimated_yield_loss_pct": 1.3,
              "loss_threshold_pct": 20,
              "critical_stage": "late_season",
              "mean_isna": {
                "initial": 1,
                "development": 1,
                "mid_season": 0.993,
                "late_season": 0.967
              },
              "mean_season_isna": 0.99,
              "valid_years": 30,
              "method": "FAO56_SIMPLIFIED_KY",
              "validated": false
            }
          },
          "planting_date": "2028-01-24",
          "harvest_date": "2028-05-18",
          "calendar": {
            "source": "GGCMI_PHASE3_V1_01",
            "cycle_days": 116,
            "reference_planting_date": "2028-02-14",
            "data_source": "Brazil CONAB",
            "grid_cell": {
              "lat": -12.75,
              "lon": -55.75
            }
          }
        }
      ],
      "soil_protection": {
        "score": 73,
        "living_cover_days": 226,
        "season_days": 366,
        "cover_fraction": 0.617,
        "family_change_fraction": 1,
        "transitions": 3,
        "family_changes": 3,
        "botanical_families": [
          "Fabaceae",
          "Poaceae"
        ],
        "includes_history": true,
        "weights": {
          "cover": 70,
          "diversity": 30
        },
        "method": "PLANNED_COVER_DIVERSITY_V1",
        "validated": false
      },
      "scores": {
        "productivity": 98.2,
        "water_security": 100,
        "soil_protection": 73.2,
        "overall": 90.5,
        "aggregation": "WORST_CROP"
      }
    },
    {
      "id": "1150-1191-2027-10-21",
      "rank": 4,
      "crops": [
        {
          "crop": {
            "eco_port_code": 1150,
            "scientific_name": "Glycine max",
            "common_names": [
              "soya bean",
              "soyabean",
              "soybean"
            ],
            "water_requirements": {
              "profile": "FAO-SOYBEAN",
              "profile_name": "Soybean",
              "crop_coefficient": {
                "initial": 0.4,
                "mid_season": 1.15,
                "late_season": 0.5
              },
              "stage_length_days": {
                "initial": 18,
                "development": 18,
                "mid_season": 47,
                "late_season": 17,
                "total": 100
              },
              "root_depth_m": {
                "initial": 0.3,
                "max": 1
              },
              "allowable_depletion": {
                "initial": 0.5,
                "mid_season": 0.6,
                "late_season": 0.9
              },
              "yield_response_factor": {
                "initial": 0.4,
                "development": 0.8,
                "mid_season": 1,
                "late_season": 0.4,
                "season": 0.85
              },
              "max_height_m": 0.6
            },
            "risk": {
              "risk_percentage": 0,
              "estimated_yield_loss_pct": 0.4,
              "loss_threshold_pct": 20,
              "critical_stage": "initial",
              "mean_isna": {
                "initial": 0.951,
                "development": 0.997,
                "mid_season": 0.999,
                "late_season": 0.999
              },
              "mean_season_isna": 0.995,
              "valid_years": 30,
              "method": "FAO56_SIMPLIFIED_KY",
              "validated": false
            }
          },
          "planting_date": "2027-10-21",
          "harvest_date": "2028-01-28",
          "calendar": {
            "source": "GGCMI_PHASE3_V1_01",
            "cycle_days": 100,
            "reference_planting_date": "2027-10-31",
            "data_source": "Brazil CONAB",
            "grid_cell": {
              "lat": -12.75,
              "lon": -55.75
            }
          }
        },
        {
          "crop": {
            "eco_port_code": 1191,
            "scientific_name": "Helianthus annuus",
            "common_names": [
              "sunflower",
              "Italian girasole",
              "cut-and-come-again"
            ],
            "water_requirements": {
              "profile": "FAO-SUNFLOWR",
              "profile_name": "Sunflower",
              "crop_coefficient": {
                "initial": 0.35,
                "mid_season": 1.15,
                "late_season": 0.35
              },
              "stage_length_days": {
                "initial": 24,
                "development": 33,
                "mid_season": 42,
                "late_season": 23,
                "total": 122
              },
              "root_depth_m": {
                "initial": 0.3,
                "max": 1.3
              },
              "allowable_depletion": {
                "initial": 0.45,
                "mid_season": 0.5,
                "late_season": 0.8
              },
              "yield_response_factor": {
                "initial": 0.4,
                "development": 0.6,
                "mid_season": 0.8,
                "late_season": 0.8,
                "season": 0.95
              },
              "max_height_m": 2
            },
            "risk": {
              "risk_percentage": 0,
              "estimated_yield_loss_pct": 1.6,
              "loss_threshold_pct": 20,
              "critical_stage": "late_season",
              "mean_isna": {
                "initial": 0.994,
                "development": 1,
                "mid_season": 0.987,
                "late_season": 0.937
              },
              "mean_season_isna": 0.983,
              "valid_years": 30,
              "method": "FAO56_SIMPLIFIED_KY",
              "validated": false
            }
          },
          "planting_date": "2028-02-03",
          "harvest_date": "2028-06-03",
          "calendar": {
            "source": "GGCMI_PHASE3_V1_01",
            "cycle_days": 122,
            "reference_planting_date": "2028-02-29",
            "data_source": "Brazil CONAB",
            "grid_cell": {
              "lat": -12.75,
              "lon": -55.75
            }
          }
        }
      ],
      "soil_protection": {
        "score": 72,
        "living_cover_days": 222,
        "season_days": 366,
        "cover_fraction": 0.607,
        "family_change_fraction": 1,
        "transitions": 3,
        "family_changes": 3,
        "botanical_families": [
          "Fabaceae",
          "Poaceae",
          "Asteraceae"
        ],
        "includes_history": true,
        "weights": {
          "cover": 70,
          "diversity": 30
        },
        "method": "PLANNED_COVER_DIVERSITY_V1",
        "validated": false
      },
      "scores": {
        "productivity": 98.4,
        "water_security": 100,
        "soil_protection": 72.5,
        "overall": 90.3,
        "aggregation": "WORST_CROP"
      }
    }
  ],
  "assumptions": {
    "loss_threshold_pct": 20,
    "initial_soil_water_fraction": 0.2,
    "spinup_days": 30,
    "planting_gap_days": 5,
    "planting_tolerance_days": 30
  },
  "warnings": [
    "Experimental method (simplified FAO-56 daily water balance with seasonal Ky, FAO-33); not validated against the official ZARC agricultural zoning.",
    "Soil water at the start of the simulation is assumed to be 20% of the available water capacity (hypothesis, not measured).",
    "Climate comes from a NASA POWER grid cell of about 50 km; local rainfall can differ.",
    "Planting dates and cycle lengths come from the GGCMI Phase 3 crop calendar (0.5° grid, regional averages from national statistics or MIRCA2000/SAGE); FAO-56 stage proportions are stretched to that cycle. Your cultivar's cycle may differ.",
    "Crops are pre-filtered by EcoCrop absolute temperature limits against the mean daily minimum/maximum over the cycle (coarse filter).",
    "Rotations with near-zero risk are practically tied: their order changes with the initial soil water assumption (20%, 50% or 80% of capacity), so treat close ranks as equivalent.",
    "Soil water comes from a generic texture class, not from the field; omit soil_type to estimate it from the location.",
    "soil_protection is a planning index: 70 × share of the season with a planned living crop + 30 × share of crop transitions that change botanical family (heuristic weights). It is not a measurement of soil health nor a forecast of organic matter.",
    "Rotations are ranked by the mean of the enabled priorities (water_security, soil_protection). Scores are absolute 0–100 scales (0 = worst possible, 100 = best possible) and do not depend on the priorities: productivity is the mean preserved yield and water_security the share of seasons without a critical loss, both for the worse of the two crops.",
    "The soil_protection priority favors long cycles that keep the soil covered until late in the season, which usually carry more water risk; combine it with productivity or water_security.",
    "soil_properties are SoilGrids 250 m estimates (0–30 cm, machine-learning maps); they do not replace a laboratory soil analysis.",
    "No regional calendar for Pulses: FAO-56 reference cycle lengths and the default October–November planting window are used, not calibrated for the region."
  ]
}
