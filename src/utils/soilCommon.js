// Map scientific soil types to familiar/common names and a short description
// Mirrors the backend mapping used by Flask for consistent UX

const SOIL_MAPPING = {
  Acrisols: { familiar_names: ["Acidic Red Soil", "Red Earth"], description: "Acidic soils with low fertility, common in tropical regions" },
  Albeluvisols: { familiar_names: ["Podzolic Soil", "Forest Soil"], description: "Soils with distinct layers, common in temperate forests" },
  Alisols: { familiar_names: ["Red Clay Soil", "Lateritic Soil"], description: "High aluminum content, red-colored soils" },
  Andosols: { familiar_names: ["Volcanic Soil", "Ash Soil"], description: "Rich, fertile soils formed from volcanic ash" },
  Arenosols: { familiar_names: ["Sandy Soil", "Desert Sand"], description: "Sandy soils with low water retention" },
  Calcisols: { familiar_names: ["Calcareous Soil", "Lime Soil"], description: "Soils with high calcium content, often alkaline" },
  Cambisols: { familiar_names: ["Brown Earth", "Loamy Soil"], description: "Well-developed, fertile soils with good structure" },
  Chernozems: { familiar_names: ["Black Earth", "Prairie Soil"], description: "Very fertile black soils with high organic matter" },
  Cryosols: { familiar_names: ["Permafrost Soil", "Tundra Soil"], description: "Soils in cold regions with permanent ice" },
  Durisols: { familiar_names: ["Hardpan Soil", "Cemented Soil"], description: "Soils with hard, cemented layers" },
  Ferralsols: { familiar_names: ["Red Tropical Soil", "Laterite"], description: "Deep red soils in tropical regions, highly weathered" },
  Fluvisols: { familiar_names: ["Alluvial Soil", "River Soil", "Floodplain Soil"], description: "Young, fertile soils from river deposits" },
  Gleysols: { familiar_names: ["Waterlogged Soil", "Wetland Soil"], description: "Soils with poor drainage, often waterlogged" },
  Gypsisols: { familiar_names: ["Gypsum Soil", "Desert Soil"], description: "Soils with high gypsum content, common in arid regions" },
  Histosols: { familiar_names: ["Peat Soil", "Organic Soil", "Bog Soil"], description: "Organic-rich soils, often waterlogged" },
  Kastanozems: { familiar_names: ["Chestnut Soil", "Steppe Soil"], description: "Brown soils in semi-arid grasslands" },
  Leptosols: { familiar_names: ["Shallow Soil", "Rocky Soil"], description: "Thin soils over bedrock or hard material" },
  Lixisols: { familiar_names: ["Red Earth", "Tropical Clay Soil"], description: "Clay-rich soils with good drainage" },
  Luvisols: { familiar_names: ["Clay Loam", "Brown Forest Soil"], description: "Well-structured soils with clay accumulation" },
  Nitisols: { familiar_names: ["Red Clay", "Tropical Clay"], description: "Deep, well-drained tropical clay soils" },
  Phaeozems: { familiar_names: ["Dark Prairie Soil", "Black Earth"], description: "Dark, fertile soils with high organic content" },
  Planosols: { familiar_names: ["Hardpan Soil", "Compacted Soil"], description: "Soils with dense, impermeable layers" },
  Plinthosols: { familiar_names: ["Ironstone Soil", "Hardpan Soil"], description: "Soils with iron-rich hard layers" },
  Podzols: { familiar_names: ["Podzolic Soil", "Forest Soil"], description: "Acidic soils with distinct light and dark layers" },
  Regosols: { familiar_names: ["Young Soil", "Immature Soil"], description: "Weakly developed soils with minimal structure" },
  Solonchaks: { familiar_names: ["Saline Soil", "Salt Soil"], description: "Soils with high salt content" },
  Solonetz: { familiar_names: ["Alkaline Soil", "Sodic Soil"], description: "Soils with high sodium content, often alkaline" },
  Stagnosols: { familiar_names: ["Waterlogged Soil", "Poorly Drained Soil"], description: "Soils with periodic water stagnation" },
  Umbrisols: { familiar_names: ["Mountain Soil", "Acid Forest Soil"], description: "Acidic soils with thick organic surface layer" },
  Vertisols: { familiar_names: ["Black Cotton Soil", "Cracking Clay", "Regur Soil"], description: "Clay-rich soils that crack when dry, very fertile" },
  'No information': { familiar_names: ["Unknown Soil", "Unclassified Soil"], description: "Soil type information not available for this location" },
};

export function getFamiliarSoilNames(scientific) {
  if (!scientific || typeof scientific !== 'string') return { familiar_names: [], description: '' };
  return SOIL_MAPPING[scientific] || { familiar_names: [scientific], description: 'Scientific soil classification' };
}







