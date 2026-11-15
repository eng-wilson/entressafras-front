// Resposta real reduzida de POST /api/rotations/simulate (Sorriso/MT, solo médio, safra 2027/28), verificada em 15/11/2026:
// soja 21/10 → 20/02 e sorgo 21/02 → 10/06, com sweep (regravada com B14: o sweep da 1ª move só a soja). Só os campos que o front usa. Uso exclusivo em testes.
import type { RotationSimulationResponse } from '../types'

export const SIMULACAO_FIXTURE: RotationSimulationResponse = {
  "agricultural_year": 2027,
  "soil_type": "medium",
  "priorities": {
    "productivity": 1,
    "water_security": 1,
    "soil_protection": 1,
    "revenue": 0
  },
  "rotation": {
    "id": "custom-1150-48747-2027-10-21",
    "rank": 1,
    "ranked_among": 14,
    "would_be_recommended": true,
    "crops": [
      {
        "crop": {
          "eco_port_code": 1150,
          "scientific_name": "Glycine max",
          "common_names": [
            "soya bean",
            "soyabean",
            "soybean",
            "soya",
            "sojaboon",
            "sojaplant",
            "sojaboontjie",
            "fejao soja",
            "soja",
            "dadou",
            "soia piini",
            "bean - soya",
            "Sojabohne"
          ],
          "family": "Magnoliopsida:Rosidae:Fabales:Leguminosae",
          "crop_cycle": {
            "min_days": 75,
            "max_days": 180
          },
          "water_requirements": {
            "profile": "FAO-SOYBEAN",
            "profile_name": "Soybean",
            "crop_coefficient": {
              "initial": 0.4,
              "mid_season": 1.15,
              "late_season": 0.5
            },
            "stage_length_days": {
              "initial": 22,
              "development": 22,
              "mid_season": 58,
              "late_season": 21,
              "total": 123
            },
            "root_depth_m": {
              "initial": 0.3,
              "max": 1.0
            },
            "allowable_depletion": {
              "initial": 0.5,
              "mid_season": 0.6,
              "late_season": 0.9
            },
            "yield_response_factor": {
              "initial": 0.4,
              "development": 0.8,
              "mid_season": 1.0,
              "late_season": 0.4,
              "season": 0.85
            },
            "max_height_m": 0.6
          },
          "risk": {
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 0.5,
            "loss_threshold_pct": 20.0,
            "critical_stage": "initial",
            "mean_isna": {
              "initial": 0.966,
              "development": 1.0,
              "mid_season": 0.997,
              "late_season": 0.992
            },
            "valid_years": 30,
            "method": "FAO56_SIMPLIFIED_KY",
            "validated": false
          }
        },
        "planting_date": "2027-10-21",
        "harvest_date": "2028-02-20",
        "calendar": {
          "source": "GGCMI_PHASE3_V1_01",
          "cycle_days": 123,
          "reference_planting_date": "2027-10-31",
          "data_source": "Brazil CONAB"
        }
      },
      {
        "crop": {
          "eco_port_code": 48747,
          "scientific_name": "Sorghum bicolor",
          "common_names": [
            "bachanta",
            "broom-corn",
            "chicken corn",
            "cholam",
            "durra",
            "grain sorghum",
            "great millet",
            "guinea corn",
            "ipwa",
            "jawa",
            "jola",
            "jowar",
            "kafir corn",
            "kaoliang",
            "mashila",
            "milo",
            "mtama",
            "sorghum",
            "sorgho",
            "sorgo",
            "Hirse"
          ],
          "family": "Liliopsida:Commelinidae:Cyperales:Gramineae",
          "crop_cycle": {
            "min_days": 90,
            "max_days": 300
          },
          "water_requirements": {
            "profile": "FAO-SORGHUM",
            "profile_name": "SORGHUM (Grain)",
            "crop_coefficient": {
              "initial": 0.3,
              "mid_season": 1.0,
              "late_season": 0.55
            },
            "stage_length_days": {
              "initial": 17,
              "development": 31,
              "mid_season": 36,
              "late_season": 27,
              "total": 111
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
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 1.0,
            "loss_threshold_pct": 20.0,
            "critical_stage": "late_season",
            "mean_isna": {
              "initial": 1.0,
              "development": 1.0,
              "mid_season": 0.993,
              "late_season": 0.966
            },
            "valid_years": 30,
            "method": "FAO56_SIMPLIFIED_KY",
            "validated": false
          }
        },
        "planting_date": "2028-02-21",
        "harvest_date": "2028-06-10",
        "calendar": {
          "source": "GGCMI_PHASE3_V1_01",
          "cycle_days": 111,
          "reference_planting_date": "2028-03-16",
          "data_source": "Brazil CONAB"
        }
      }
    ],
    "soil_protection": {
      "score": 75,
      "living_cover_days": 234,
      "season_days": 366,
      "cover_fraction": 0.639,
      "botanical_families": [
        "Fabaceae",
        "Poaceae"
      ]
    },
    "scores": {
      "productivity": 99.0,
      "water_security": 100.0,
      "soil_protection": 74.8,
      "overall": 91.3
    },
    "checks": []
  },
  "first_planting_sweep": {
    "moved_crop": "first",
    "points": [
      {
        "decendio_idx": 0,
        "label": "1-10 Sep",
        "crops": [
          {
            "code": 1150,
            "planting_date": "2027-09-01",
            "harvest_date": "2028-01-01",
            "risk_percentage": 13.3,
            "estimated_yield_loss_pct": 10.2,
            "in_calendar": false,
            "temperature_ok": true
          },
          {
            "code": 48747,
            "planting_date": "2028-02-21",
            "harvest_date": "2028-06-10",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 0.7,
            "in_calendar": true,
            "temperature_ok": true
          }
        ],
        "scores": {
          "productivity": 89.8,
          "water_security": 86.7,
          "soil_protection": 74.8,
          "overall": 83.8
        }
      },
      {
        "decendio_idx": 1,
        "label": "11-20 Sep",
        "crops": [
          {
            "code": 1150,
            "planting_date": "2027-09-11",
            "harvest_date": "2028-01-11",
            "risk_percentage": 10.0,
            "estimated_yield_loss_pct": 6.2,
            "in_calendar": false,
            "temperature_ok": true
          },
          {
            "code": 48747,
            "planting_date": "2028-02-21",
            "harvest_date": "2028-06-10",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 0.7,
            "in_calendar": true,
            "temperature_ok": true
          }
        ],
        "scores": {
          "productivity": 93.8,
          "water_security": 90.0,
          "soil_protection": 74.8,
          "overall": 86.2
        }
      },
      {
        "decendio_idx": 2,
        "label": "21-end Sep",
        "crops": [
          {
            "code": 1150,
            "planting_date": "2027-09-21",
            "harvest_date": "2028-01-21",
            "risk_percentage": 3.3,
            "estimated_yield_loss_pct": 3.1,
            "in_calendar": false,
            "temperature_ok": true
          },
          {
            "code": 48747,
            "planting_date": "2028-02-21",
            "harvest_date": "2028-06-10",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 0.7,
            "in_calendar": true,
            "temperature_ok": true
          }
        ],
        "scores": {
          "productivity": 96.9,
          "water_security": 96.7,
          "soil_protection": 74.8,
          "overall": 89.5
        }
      },
      {
        "decendio_idx": 3,
        "label": "1-10 Oct",
        "crops": [
          {
            "code": 1150,
            "planting_date": "2027-10-01",
            "harvest_date": "2028-01-31",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 1.8,
            "in_calendar": true,
            "temperature_ok": true
          },
          {
            "code": 48747,
            "planting_date": "2028-02-21",
            "harvest_date": "2028-06-10",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 0.7,
            "in_calendar": true,
            "temperature_ok": true
          }
        ],
        "scores": {
          "productivity": 98.2,
          "water_security": 100.0,
          "soil_protection": 74.8,
          "overall": 91.0
        }
      },
      {
        "decendio_idx": 4,
        "label": "11-20 Oct",
        "crops": [
          {
            "code": 1150,
            "planting_date": "2027-10-11",
            "harvest_date": "2028-02-10",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 0.7,
            "in_calendar": true,
            "temperature_ok": true
          },
          {
            "code": 48747,
            "planting_date": "2028-02-21",
            "harvest_date": "2028-06-10",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 1.2,
            "in_calendar": true,
            "temperature_ok": true
          }
        ],
        "scores": {
          "productivity": 98.8,
          "water_security": 100.0,
          "soil_protection": 74.8,
          "overall": 91.2
        }
      },
      {
        "decendio_idx": 5,
        "label": "21-end Oct",
        "crops": [
          {
            "code": 1150,
            "planting_date": "2027-10-21",
            "harvest_date": "2028-02-20",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 0.5,
            "in_calendar": true,
            "temperature_ok": true
          },
          {
            "code": 48747,
            "planting_date": "2028-02-21",
            "harvest_date": "2028-06-10",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 1.0,
            "in_calendar": true,
            "temperature_ok": true
          }
        ],
        "scores": {
          "productivity": 99.0,
          "water_security": 100.0,
          "soil_protection": 74.8,
          "overall": 91.3
        }
      }
    ],
    "best_decendio_idx": 5,
    "worst_decendio_idx": 0
  },
  "second_planting_sweep": {
    "moved_crop": "second",
    "points": [
      {
        "decendio_idx": 17,
        "label": "21-end Feb",
        "crops": [
          {
            "code": 1150,
            "planting_date": "2027-10-21",
            "harvest_date": "2028-02-20",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 0.5,
            "in_calendar": true,
            "temperature_ok": true
          },
          {
            "code": 48747,
            "planting_date": "2028-02-21",
            "harvest_date": "2028-06-10",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 1.0,
            "in_calendar": true,
            "temperature_ok": true
          }
        ],
        "scores": {
          "productivity": 99.0,
          "water_security": 100.0,
          "soil_protection": 74.8,
          "overall": 91.3
        }
      },
      {
        "decendio_idx": 18,
        "label": "1-10 Mar",
        "crops": [
          {
            "code": 1150,
            "planting_date": "2027-10-21",
            "harvest_date": "2028-02-20",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 0.5,
            "in_calendar": true,
            "temperature_ok": true
          },
          {
            "code": 48747,
            "planting_date": "2028-03-01",
            "harvest_date": "2028-06-19",
            "risk_percentage": 3.3,
            "estimated_yield_loss_pct": 2.6,
            "in_calendar": true,
            "temperature_ok": true
          }
        ],
        "scores": {
          "productivity": 97.4,
          "water_security": 96.7,
          "soil_protection": 74.8,
          "overall": 89.6
        }
      },
      {
        "decendio_idx": 19,
        "label": "11-20 Mar",
        "crops": [
          {
            "code": 1150,
            "planting_date": "2027-10-21",
            "harvest_date": "2028-02-20",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 0.5,
            "in_calendar": true,
            "temperature_ok": true
          },
          {
            "code": 48747,
            "planting_date": "2028-03-11",
            "harvest_date": "2028-06-29",
            "risk_percentage": 3.3,
            "estimated_yield_loss_pct": 4.4,
            "in_calendar": true,
            "temperature_ok": true
          }
        ],
        "scores": {
          "productivity": 95.6,
          "water_security": 96.7,
          "soil_protection": 74.8,
          "overall": 89.0
        }
      },
      {
        "decendio_idx": 20,
        "label": "21-end Mar",
        "crops": [
          {
            "code": 1150,
            "planting_date": "2027-10-21",
            "harvest_date": "2028-02-20",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 0.5,
            "in_calendar": true,
            "temperature_ok": true
          },
          {
            "code": 48747,
            "planting_date": "2028-03-21",
            "harvest_date": "2028-07-09",
            "risk_percentage": 3.3,
            "estimated_yield_loss_pct": 7.2,
            "in_calendar": true,
            "temperature_ok": true
          }
        ],
        "scores": {
          "productivity": 92.8,
          "water_security": 96.7,
          "soil_protection": 74.8,
          "overall": 88.1
        }
      },
      {
        "decendio_idx": 21,
        "label": "1-10 Apr",
        "crops": [
          {
            "code": 1150,
            "planting_date": "2027-10-21",
            "harvest_date": "2028-02-20",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 0.5,
            "in_calendar": true,
            "temperature_ok": true
          },
          {
            "code": 48747,
            "planting_date": "2028-04-01",
            "harvest_date": "2028-07-20",
            "risk_percentage": 20.0,
            "estimated_yield_loss_pct": 12.0,
            "in_calendar": true,
            "temperature_ok": true
          }
        ],
        "scores": {
          "productivity": 88.0,
          "water_security": 80.0,
          "soil_protection": 74.8,
          "overall": 80.9
        }
      },
      {
        "decendio_idx": 22,
        "label": "11-20 Apr",
        "crops": [
          {
            "code": 1150,
            "planting_date": "2027-10-21",
            "harvest_date": "2028-02-20",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 0.5,
            "in_calendar": true,
            "temperature_ok": true
          },
          {
            "code": 48747,
            "planting_date": "2028-04-11",
            "harvest_date": "2028-07-30",
            "risk_percentage": 33.3,
            "estimated_yield_loss_pct": 17.1,
            "in_calendar": true,
            "temperature_ok": true
          }
        ],
        "scores": {
          "productivity": 82.9,
          "water_security": 66.7,
          "soil_protection": 74.8,
          "overall": 74.8
        }
      },
      {
        "decendio_idx": 23,
        "label": "21-end Apr",
        "crops": [
          {
            "code": 1150,
            "planting_date": "2027-10-21",
            "harvest_date": "2028-02-20",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 0.5,
            "in_calendar": true,
            "temperature_ok": true
          },
          {
            "code": 48747,
            "planting_date": "2028-04-21",
            "harvest_date": "2028-08-09",
            "risk_percentage": 60.0,
            "estimated_yield_loss_pct": 28.1,
            "in_calendar": false,
            "temperature_ok": true
          }
        ],
        "scores": {
          "productivity": 71.9,
          "water_security": 40.0,
          "soil_protection": 74.8,
          "overall": 62.2
        }
      },
      {
        "decendio_idx": 24,
        "label": "1-10 May",
        "crops": [
          {
            "code": 1150,
            "planting_date": "2027-10-21",
            "harvest_date": "2028-02-20",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 0.5,
            "in_calendar": true,
            "temperature_ok": true
          },
          {
            "code": 48747,
            "planting_date": "2028-05-01",
            "harvest_date": "2028-08-19",
            "risk_percentage": 96.7,
            "estimated_yield_loss_pct": 40.7,
            "in_calendar": false,
            "temperature_ok": true
          }
        ],
        "scores": {
          "productivity": 59.3,
          "water_security": 3.3,
          "soil_protection": 74.8,
          "overall": 45.8
        }
      },
      {
        "decendio_idx": 25,
        "label": "11-20 May",
        "crops": [
          {
            "code": 1150,
            "planting_date": "2027-10-21",
            "harvest_date": "2028-02-20",
            "risk_percentage": 0.0,
            "estimated_yield_loss_pct": 0.5,
            "in_calendar": true,
            "temperature_ok": true
          },
          {
            "code": 48747,
            "planting_date": "2028-05-11",
            "harvest_date": "2028-08-29",
            "risk_percentage": 93.3,
            "estimated_yield_loss_pct": 44.4,
            "in_calendar": false,
            "temperature_ok": true
          }
        ],
        "scores": {
          "productivity": 55.6,
          "water_security": 6.7,
          "soil_protection": 74.8,
          "overall": 45.7
        }
      }
    ],
    "best_decendio_idx": 17,
    "worst_decendio_idx": 25
  },
  "assumptions": {
    "loss_threshold_pct": 20.0,
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
    "Rotations are ranked by the mean of the enabled priorities (productivity, water_security, soil_protection). Scores are absolute 0–100 scales (0 = worst possible, 100 = best possible) and do not depend on the priorities: productivity is the mean preserved yield and water_security the share of seasons without a critical loss, both for the worse of the two crops.",
    "The soil_protection priority favors long cycles that keep the soil covered until late in the season, which usually carry more water risk; combine it with productivity or water_security.",
    "Without crop_history only the A→B transition is counted; recommended rotations always change family, so the diversity part of soil_protection is always full.",
    "No regional calendar for Pulses: FAO-56 reference cycle lengths and the default October–November planting window are used, not calibrated for the region.",
    "Custom rotations are simulated as sent, without the recommendation filters (botanical family, temperature, regional calendar); issues are listed in their checks. Their rank is the position they would take among the recommended rotations. A one-crop rotation is ranked by the same indicators: the fallow after it lowers its soil_protection."
  ]
}
