// Resposta real reduzida de POST /api/rotations/recommendations (Sorriso/MT, solo médio), verificada em 14/11/2026.
// Só os campos que o front usa. Uso exclusivo em testes (unitários e Playwright).
import type { RotationRecommendations } from '../types'

export const ROTACOES_FIXTURE: RotationRecommendations = {
  "agricultural_year": 2027,
  "soil_type": "medium",
  "rotations": [
    {
      "id": "1150-8418-2027-10-15",
      "rank": 1,
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
                "initial": 15,
                "development": 15,
                "mid_season": 40,
                "late_season": 15,
                "total": 85
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
              "risk_percentage": 10,
              "estimated_yield_loss_pct": 6,
              "loss_threshold_pct": 20,
              "critical_stage": "mid_season",
              "mean_isna": {
                "initial": 0.95,
                "development": 0.9,
                "mid_season": 0.84,
                "late_season": 0.8
              },
              "valid_years": 10,
              "method": "MOCK",
              "validated": false
            }
          },
          "planting_date": "2027-10-15",
          "harvest_date": "2028-01-07"
        },
        {
          "crop": {
            "eco_port_code": 8418,
            "scientific_name": "Pennisetum glaucum",
            "common_names": [
              "pearl millett",
              "bulrush millett",
              "negrito millet"
            ],
            "water_requirements": {
              "profile": "FAO-MILLET",
              "profile_name": "MILLET",
              "crop_coefficient": {
                "initial": 0.3,
                "mid_season": 1,
                "late_season": 0.3
              },
              "stage_length_days": {
                "initial": 15,
                "development": 25,
                "mid_season": 40,
                "late_season": 25,
                "total": 105
              },
              "root_depth_m": {
                "initial": 0.3,
                "max": 1.2
              },
              "allowable_depletion": {
                "initial": 0.5,
                "mid_season": 0.6,
                "late_season": 0.7
              },
              "yield_response_factor": {
                "initial": 0.4,
                "development": 0.6,
                "mid_season": 1.25,
                "late_season": 0.8,
                "season": 1
              },
              "max_height_m": 1.5
            },
            "risk": {
              "risk_percentage": 20,
              "estimated_yield_loss_pct": 8,
              "loss_threshold_pct": 20,
              "critical_stage": "development",
              "mean_isna": {
                "initial": 0.9,
                "development": 0.7,
                "mid_season": 0.75,
                "late_season": 0.7
              },
              "valid_years": 10,
              "method": "MOCK",
              "validated": false
            }
          },
          "planting_date": "2028-01-13",
          "harvest_date": "2028-04-26"
        }
      ]
    },
    {
      "id": "1150-48747-2027-10-15",
      "rank": 2,
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
                "initial": 15,
                "development": 15,
                "mid_season": 40,
                "late_season": 15,
                "total": 85
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
              "risk_percentage": 10,
              "estimated_yield_loss_pct": 6,
              "loss_threshold_pct": 20,
              "critical_stage": "mid_season",
              "mean_isna": {
                "initial": 0.95,
                "development": 0.9,
                "mid_season": 0.84,
                "late_season": 0.8
              },
              "valid_years": 10,
              "method": "MOCK",
              "validated": false
            }
          },
          "planting_date": "2027-10-15",
          "harvest_date": "2028-01-07"
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
                "initial": 20,
                "development": 35,
                "mid_season": 40,
                "late_season": 30,
                "total": 125
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
              "risk_percentage": 20,
              "estimated_yield_loss_pct": 9,
              "loss_threshold_pct": 20,
              "critical_stage": "mid_season",
              "mean_isna": {
                "initial": 0.92,
                "development": 0.82,
                "mid_season": 0.72,
                "late_season": 0.65
              },
              "valid_years": 10,
              "method": "MOCK",
              "validated": false
            }
          },
          "planting_date": "2028-01-13",
          "harvest_date": "2028-05-16"
        }
      ]
    },
    {
      "id": "1150-2175-2027-10-15",
      "rank": 3,
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
                "initial": 15,
                "development": 15,
                "mid_season": 40,
                "late_season": 15,
                "total": 85
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
              "risk_percentage": 10,
              "estimated_yield_loss_pct": 6,
              "loss_threshold_pct": 20,
              "critical_stage": "mid_season",
              "mean_isna": {
                "initial": 0.95,
                "development": 0.9,
                "mid_season": 0.84,
                "late_season": 0.8
              },
              "valid_years": 10,
              "method": "MOCK",
              "validated": false
            }
          },
          "planting_date": "2027-10-15",
          "harvest_date": "2028-01-07"
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
                "initial": 20,
                "development": 35,
                "mid_season": 40,
                "late_season": 30,
                "total": 125
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
              "risk_percentage": 30,
              "estimated_yield_loss_pct": 14.5,
              "loss_threshold_pct": 20,
              "critical_stage": "mid_season",
              "mean_isna": {
                "initial": 0.9,
                "development": 0.78,
                "mid_season": 0.66,
                "late_season": 0.6
              },
              "valid_years": 10,
              "method": "MOCK",
              "validated": false
            }
          },
          "planting_date": "2028-01-13",
          "harvest_date": "2028-05-16"
        }
      ]
    },
    {
      "id": "1150-1160-2027-10-15",
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
                "initial": 15,
                "development": 15,
                "mid_season": 40,
                "late_season": 15,
                "total": 85
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
              "risk_percentage": 10,
              "estimated_yield_loss_pct": 6,
              "loss_threshold_pct": 20,
              "critical_stage": "mid_season",
              "mean_isna": {
                "initial": 0.95,
                "development": 0.9,
                "mid_season": 0.84,
                "late_season": 0.8
              },
              "valid_years": 10,
              "method": "MOCK",
              "validated": false
            }
          },
          "planting_date": "2027-10-15",
          "harvest_date": "2028-01-07"
        },
        {
          "crop": {
            "eco_port_code": 1160,
            "scientific_name": "Gossypium hirsutum",
            "common_names": [
              "cotton",
              "upland cotton",
              "coton"
            ],
            "water_requirements": {
              "profile": "FAO-COTTON",
              "profile_name": "COTTON",
              "crop_coefficient": {
                "initial": 0.35,
                "mid_season": 1.2,
                "late_season": 0.6
              },
              "stage_length_days": {
                "initial": 30,
                "development": 50,
                "mid_season": 60,
                "late_season": 55,
                "total": 195
              },
              "root_depth_m": {
                "initial": 0.3,
                "max": 1.4
              },
              "allowable_depletion": {
                "initial": 0.65,
                "mid_season": 0.65,
                "late_season": 0.9
              },
              "yield_response_factor": {
                "initial": 0.2,
                "development": 0.5,
                "mid_season": 0.5,
                "late_season": 0.25,
                "season": 0.85
              },
              "max_height_m": 1.3
            },
            "risk": {
              "risk_percentage": 40,
              "estimated_yield_loss_pct": 18,
              "loss_threshold_pct": 20,
              "critical_stage": "mid_season",
              "mean_isna": {
                "initial": 0.95,
                "development": 0.8,
                "mid_season": 0.6,
                "late_season": 0.5
              },
              "valid_years": 10,
              "method": "MOCK",
              "validated": false
            }
          },
          "planting_date": "2028-01-13",
          "harvest_date": "2028-07-25"
        }
      ]
    }
  ],
  "assumptions": {
    "loss_threshold_pct": 20,
    "initial_soil_water_fraction": 0.2,
    "spinup_days": 30,
    "planting_gap_days": 5
  },
  "warnings": [
    "MOCK: ranking and risk values are placeholders for contract integration; they are not computed from climate data.",
    "Crop cycle lengths are FAO-56 reference values, not calibrated for Brazilian cultivars; harvest dates may be earlier than in practice."
  ]
}
