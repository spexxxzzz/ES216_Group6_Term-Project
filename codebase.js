/*// =================================================================================
// Step 1 (Corrected): Define the Area of Interest (AOI) for the Western Ghats
// =================================================================================

// 1. Load the RESOLVE Ecoregions 2017 dataset.
// This is the updated and correct asset ID for the global ecoregions.
var ecoregions = ee.FeatureCollection('RESOLVE/ECOREGIONS/2017');

// 2. Filter the collection to select the ecoregions that make up the Western Ghats.
// The property name 'ECO_NAME' is the same in this new dataset.
var westernGhatsFilter = ee.Filter.or(
  ee.Filter.stringContains('ECO_NAME', 'North Western Ghats'),
  ee.Filter.stringContains('ECO_NAME', 'South Western Ghats')
);
var westernGhatsBoundary = ecoregions.filter(westernGhatsFilter);

// 3. Dissolve the individual polygons into a single boundary for efficiency.
var westernGhatsAOI = westernGhatsBoundary.union();

// 4. Add the resulting boundary to the map to visualize it.
Map.addLayer(westernGhatsAOI, {color: 'FF0000'}, 'Western Ghats AOI');

// 5. Center the map view on our area of interest.
Map.centerObject(westernGhatsAOI, 6);

// 6. Print the object to the console to inspect its properties.
print('Western Ghats AOI:', westernGhatsAOI);

// =================================================================================
// Step (Utility): Calculate the Exact Area of the Study Region
// =================================================================================

// 1. Calculate the area in square meters.
// We use .geometry() to be explicit and .area() with a maxError for accuracy.
var areaInMeters = westernGhatsAOI.geometry().area(100);

// 2. Convert to square kilometers.
var areaInKm2 = ee.Number(areaInMeters).divide(1000000);

// 3. (THE FIX) Use .evaluate() to safely print the server-side number.
// This is the most robust way to get a computed value from the server.
areaInKm2.evaluate(function(result, error) {
  if (error) {
    print('Error calculating area:', error);
  } else {
    print('Calculated Area of Western Ghats (in square kilometers):', result);
  }
});

// =================================================================================
// Step 2 (Corrected): Load DEM and Derive Terrain Factors (Elevation, Slope, Aspect)
// =================================================================================

// 1. Load the SRTM Digital Elevation Model. This is an ee.Image (raster data).
// =================================================================================
// Step 2 (Corrected): Load DEM and Derive Terrain Factors (Elevation, Slope, Aspect)
// =================================================================================

// 1. Load the SRTM Digital Elevation Model. This is an ee.Image (raster data).
var dem = ee.Image('USGS/SRTMGL1_003');

// 2. Clip the global DEM to our specific Area of Interest.
var dem_AOI = dem.clip(westernGhatsAOI);

// 3. Use the ee.Terrain algorithm to calculate Slope from the DEM.
var slope_AOI = ee.Terrain.slope(dem_AOI);

// 4. Use the ee.Terrain algorithm to calculate Aspect from the DEM.
var aspect_AOI = ee.Terrain.aspect(dem_AOI);

// 5. Define NEW visualization parameters with new colors.
// We'll use a "Spectral" ramp for elevation: Blue (low) -> Green -> Yellow -> Red (high)
var elevationVis = {
  min: 0,
  max: 2500,
  palette: ['#2b83ba', '#abdda4', '#ffffbf', '#fdae61', '#d7191c']
};

// We'll use a sequential Yellow-to-Red palette for slope: Yellow (flat) -> Red (steep)
var slopeVis = {
  min: 0,
  max: 60,
  palette: ['#ffffd4', '#fed98e', '#fe9929', '#d95f0e', '#993404']
};

// We'll use a "four-corner" palette for Aspect: N(Red), E(Yellow), S(Green), W(Blue)
var aspectVis = {
  min: 0,
  max: 360,
  palette: ['#FF0000', '#FFFF00', '#00FF00', '#0000FF', '#FF0000']
};

// 6. Add the new layers to the map.
Map.addLayer(dem_AOI, elevationVis, 'Elevation', false);
Map.addLayer(slope_AOI, slopeVis, 'Slope', false);
Map.addLayer(aspect_AOI, aspectVis, 'Aspect', false);

// 7. Print the new image objects to the console.
print('Clipped DEM:', dem_AOI);
print('Slope:', slope_AOI);
print('Aspect:', aspect_AOI);

// =================================================================================
// Step 2b: Add a Legend to the Map
// =================================================================================

// --- Create the main Legend Panel ---
var legendPanel = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px',
    border: '1px solid black'
  }
});

var legendTitle = ui.Label({
  value: 'Legend',
  style: {fontWeight: 'bold', fontSize: '18px', margin: '0 0 4px 0', padding: '0'}
});
legendPanel.add(legendTitle);

// --- Helper function to create a labeled color box ---
var makeLegendEntry = function(color, label) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      // Use padding to give the box height and width.
      padding: '8px',
      margin: '0 0 4px 0',
      border: '1px solid grey'
    }
  });
  var description = ui.Label({
    value: label,
    style: {margin: '0 0 4px 6px'}
  });
  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

// --- 1. Elevation Legend ---
legendPanel.add(ui.Label({value: 'Elevation (m)', style: {fontWeight: 'bold'}}));
var elevPalette = elevationVis.palette;
legendPanel.add(makeLegendEntry(elevPalette[0], '0 (Low)'));
legendPanel.add(makeLegendEntry(elevPalette[2], '1250 (Mid)'));
legendPanel.add(makeLegendEntry(elevPalette[4], '2500 (High)'));

// --- 2. Slope Legend ---
legendPanel.add(ui.Label({value: 'Slope (°)', style: {fontWeight: 'bold'}}));
var slopePalette = slopeVis.palette;
legendPanel.add(makeLegendEntry(slopePalette[0], '0 (Flat)'));
legendPanel.add(makeLegendEntry(slopePalette[2], '30 (Mid)'));
legendPanel.add(makeLegendEntry(slopePalette[4], '60 (Steep)'));

// --- 3. Aspect Legend ---
legendPanel.add(ui.Label({value: 'Aspect (Direction)', style: {fontWeight: 'bold'}}));
legendPanel.add(makeLegendEntry('#FF0000', 'North'));
legendPanel.add(makeLegendEntry('#FFFF00', 'East'));
legendPanel.add(makeLegendEntry('#00FF00', 'South'));
legendPanel.add(makeLegendEntry('#0000FF', 'West'));

// --- Add the legend to the map ---
ui.root.add(legendPanel);





// =================================================================================
// Step 3: Derive Vegetation Cover using NDVI from Sentinel-2 Imagery
// =================================================================================

// 1. Define parameters for our image query.
var START_DATE = '2023-06-01';
var END_DATE = '2025-09-30';

// 2. Load the Sentinel-2 Level-2A (Surface Reflectance) image collection.
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED');

// 3. Filter the collection.
var filtered_s2 = s2
  .filter(ee.Filter.bounds(westernGhatsAOI))
  .filter(ee.Filter.date(START_DATE, END_DATE))
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

// 4. Create a cloud masking function.
function maskS2clouds(image) {
  var scl = image.select('SCL');
  var desiredPixels = scl.eq(4).or(scl.eq(5)).or(scl.eq(6)).or(scl.eq(7));
  return image.updateMask(desiredPixels);
}

// 5. Create a function to calculate NDVI.
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
}

// 6. Apply the functions and create a composite.
var s2_processed = filtered_s2
  .map(maskS2clouds)
  .map(addNDVI);

var ndvi_AOI = s2_processed.select('NDVI').median().clip(westernGhatsAOI);

// 7. Define a NEW visualization palette for NDVI.
// This is a colorblind-safe brown (bare) -> yellow (low) -> green (high) ramp.
var ndviVis = {
  min: 0,
  max: 0.8,
  palette: ['#a6611a', '#dfc27d', '#f5f5f5', '#80cdc1', '#018571']
};

// 8. Add the final NDVI layer to the map.
Map.addLayer(ndvi_AOI, ndviVis, 'NDVI', false);

// 9. Print the final NDVI image to the console.
print('NDVI Composite:', ndvi_AOI);







// =================================================================================
// Step 4 (Corrected): Derive Rainfall and River Proximity Factors
// =================================================================================

// --- Part A: Maximum 24-Hour Rainfall ---

var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY');
var rainfall = chirps.filter(ee.Filter.date('2015-01-01', '2025-10-31'));
var maxRainfall = rainfall.max();
var maxRainfall_AOI = maxRainfall.clip(westernGhatsAOI);

// 4. Define a NEW visualization palette for rainfall.
// This is a sequential blue ramp (light = low rain, dark = high rain).
var rainfallVis = {
  min: 50,
  max: 400,
  palette: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c']
};

Map.addLayer(maxRainfall_AOI, rainfallVis, 'Max 24-Hour Rainfall', false);
print('Max Rainfall Image:', maxRainfall_AOI);

// --- Part B: Distance to Rivers (CORRECTED LOGIC) ---

var rivers = ee.FeatureCollection('WWF/HydroSHEDS/v1/FreeFlowingRivers');
var rivers_AOI = rivers.filter(ee.Filter.bounds(westernGhatsAOI));
var distanceToRiver = rivers_AOI.distance({
  searchRadius: 50000,
  maxError: 10
});
var distanceToRiver_AOI = distanceToRiver.clip(westernGhatsAOI);

// 4. Define a NEW visualization palette for distance.
// This is a diverging ramp: Red (close/high risk) -> White (mid) -> Blue (far/low risk).
var distanceVis = {
  min: 0,
  max: 10000,
  palette: ['#d7191c', '#fdae61', '#ffffbf', '#abdda4', '#2b83ba']
};

Map.addLayer(distanceToRiver_AOI, distanceVis, 'Distance to River', false);
print('Distance to River Image:', distanceToRiver_AOI);










// =================================================================================
// Step 5: Add a Legend for the Dynamic Layers
// =================================================================================

// --- Create the main Legend Panel for Dynamic Layers ---
var legendPanel2 = ui.Panel({
  style: {
    position: 'bottom-right', // Place it in the bottom-right corner
    padding: '8px 15px',
    border: '1px solid black'
  }
});

var legendTitle2 = ui.Label({
  value: 'Legend (Dynamic Layers)',
  style: {fontWeight: 'bold', fontSize: '18px', margin: '0 0 4px 0', padding: '0'}
});
legendPanel2.add(legendTitle2);

// --- Helper function (we can reuse the one from Step 2 if it's in the same scope,
// but for clarity, we define it here again) ---
var makeLegendEntry = function(color, label) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 0 4px 0',
      border: '1px solid grey'
    }
  });
  var description = ui.Label({
    value: label,
    style: {margin: '0 0 4px 6px'}
  });
  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

// --- 1. NDVI Legend ---
legendPanel2.add(ui.Label({value: 'NDVI (Vegetation)', style: {fontWeight: 'bold'}}));
var ndviPalette = ndviVis.palette;
legendPanel2.add(makeLegendEntry(ndviPalette[0], '0.0 (Bare)'));
legendPanel2.add(makeLegendEntry(ndviPalette[2], '0.4 (Sparse)'));
legendPanel2.add(makeLegendEntry(ndviPalette[4], '0.8 (Dense)'));

// --- 2. Rainfall Legend ---
legendPanel2.add(ui.Label({value: 'Max 24h Rainfall (mm)', style: {fontWeight: 'bold'}}));
var rainPalette = rainfallVis.palette;
legendPanel2.add(makeLegendEntry(rainPalette[0], '50 (Low)'));
legendPanel2.add(makeLegendEntry(rainPalette[2], '225 (Mid)'));
legendPanel2.add(makeLegendEntry(rainPalette[4], '400 (High)'));

// --- 3. Distance to River Legend ---
legendPanel2.add(ui.Label({value: 'Distance to River (m)', style: {fontWeight: 'bold'}}));
var distPalette = distanceVis.palette;
legendPanel2.add(makeLegendEntry(distPalette[0], '0 (Close)'));
legendPanel2.add(makeLegendEntry(distPalette[2], '5,000 (Mid)'));
legendPanel2.add(makeLegendEntry(distPalette[4], '10,000 (Far)'));

// --- Add the second legend to the map ---
ui.root.add(legendPanel2);





// =================================================================================
// Step 5: Normalization and Reclassification of Factors
//
// Goal: Convert all factor layers to a common, unitless "Vulnerability Scale"
// from 0 (lowest vulnerability) to 1 (highest vulnerability).
// =================================================================================

// --- 1. Normalize Layers with an INVERSE relationship to flood risk ---
// (Higher value = lower risk)

// Elevation: Low elevation is high risk.
var elevation_vuln = dem_AOI.unitScale(0, 2500).multiply(-1).add(1);

// Slope: Low slope (flat) is high risk.
var slope_vuln = slope_AOI.unitScale(0, 60).multiply(-1).add(1);

// NDVI: Low NDVI (no vegetation) is high risk.
var ndvi_vuln = ndvi_AOI.unitScale(0, 1).multiply(-1).add(1);

// Distance to River: Low distance (close) is high risk.
var distance_vuln = distanceToRiver_AOI.unitScale(0, 10000).multiply(-1).add(1);


// --- 2. Normalize Layers with a DIRECT relationship to flood risk ---
// (Higher value = higher risk)

// Max Rainfall: High rainfall is high risk.
var rainfall_vuln = maxRainfall_AOI.unitScale(50, 400);


// --- 3. Reclassify Layers with a NON-LINEAR relationship to flood risk ---

// Aspect: West-facing slopes are high risk, North is medium, others are low.
var aspect_rad = aspect_AOI.multiply(Math.PI / 180);

// Convert our "peak risk" direction (West, 270°) to radians
var west_rad = ee.Number(270 * Math.PI / 180);

// Calculate the cosine of the difference from West.
// This gives a range from -1 (East/safest) to +1 (West/riskiest).
var cos_similarity_to_west = aspect_rad.subtract(west_rad).cos();

// Normalize the -1 to +1 range to our final 0 to 1 vulnerability scale.
// Formula: (value + 1) / 2
var aspect_vuln = cos_similarity_to_west.add(1).divide(2);


// --- 4. Visualization and Inspection ---

// Define a consistent visualization palette for all vulnerability layers.
// Black will be low vulnerability (0), and White will be high vulnerability (1).
var vulnVis = {min: 0, max: 1, palette: ['#000000', '#FFFFFF']};

// Add the new normalized layers to the map for verification.
Map.addLayer(elevation_vuln.clip(westernGhatsAOI), vulnVis, 'Elevation Vulnerability', false);
Map.addLayer(slope_vuln.clip(westernGhatsAOI), vulnVis, 'Slope Vulnerability', false);
Map.addLayer(aspect_vuln.clip(westernGhatsAOI), vulnVis, 'Aspect Vulnerability', false);
Map.addLayer(ndvi_vuln.clip(westernGhatsAOI), vulnVis, 'NDVI Vulnerability', false);
Map.addLayer(rainfall_vuln.clip(westernGhatsAOI), vulnVis, 'Rainfall Vulnerability', false);
Map.addLayer(distance_vuln.clip(westernGhatsAOI), vulnVis, 'Distance Vulnerability', false);

// Print one of the new layers to the console to check its structure.








// =================================================================================
// Step 6 (Definitive Final Version): PCA, FSI Calculation, and Optimized SAR Validation
// =================================================================================

// --- PART A: DEFINE HELPER FUNCTIONS ---

var calculateFSI = function(pcaInput, bandNames, weightsList) {
  var weightsImage = ee.Image.constant(weightsList).rename(bandNames);
  var fsi = pcaInput.multiply(weightsImage)
    .expression('b(0) + b(1) + b(2) + b(3) + b(4) + b(5)');

  var fsiVis = {min: 0, max: 1, palette: ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c']};
  Map.addLayer(fsi.clip(westernGhatsAOI), fsiVis, 'Flood Susceptibility Index');
  print('SUCCESS: Flood Susceptibility Index map has been calculated and added.');

var runRobustSarValidation = function(fsi) {
  print('--- Starting Robust SAR Validation (Kerala Region) ---');
  
  // Define Kerala region rectangle (longitude_min, latitude_min, longitude_max, latitude_max)
  var keralaRegion = ee.Geometry.Rectangle([75.5, 8.5, 77.5, 12.5]);
  
  // ✅ Add the rectangle to the map for visualization
  Map.addLayer(keralaRegion, {color: 'red'}, 'Kerala Validation Region');
  Map.centerObject(keralaRegion, 8);

  // 1. Load Sentinel-1 data
  var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterBounds(keralaRegion)
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
      .filter(ee.Filter.eq('instrumentMode', 'IW'))
      .select('VV');

  var before = s1.filterDate('2018-05-01', '2018-05-31').median();
  var after = s1.filterDate('2018-08-18', '2018-08-25').median();
  
  // 2. Apply speckle filter
  var radius = 50;
  var beforeFiltered = before.focal_median(radius, 'circle', 'meters');
  var afterFiltered = after.focal_median(radius, 'circle', 'meters');
  
  // 3. Calculate ratio (before/after)
  var ratio = beforeFiltered.divide(afterFiltered);
  
  // 4. Threshold ratio to find floods
  var RATIO_THRESHOLD = 1.5;
  var floodExtent = ratio.gt(RATIO_THRESHOLD).rename('flood');
  
  // 5. Add flood extent layer to the map
  Map.addLayer(floodExtent.selfMask(), {palette: '0000FF'}, 'SAR Flood Extent (Ratio Method)');
  
  // 6. Perform statistical validation
  var validationImage = fsi.addBands(floodExtent);
  var stats = validationImage.reduceRegion({
    reducer: ee.Reducer.mean().group({ 
       groupField: 1, 
       groupName: 'flood_class' 
     }),
    geometry: keralaRegion,
    scale: 300,
    maxPixels: 1e10,
    bestEffort: true
  });
  
  print('=== SAR VALIDATION RESULTS (Ratio Method) ===');
  print(stats);
};
*/
// =================================================================================
// Step 1 (Corrected): Define the Area of Interest (AOI) for the Western Ghats
// =================================================================================

// 1. Load the RESOLVE Ecoregions 2017 dataset.
// This is the updated and correct asset ID for the global ecoregions.
var ecoregions = ee.FeatureCollection('RESOLVE/ECOREGIONS/2017');

// 2. Filter the collection to select the ecoregions that make up the Western Ghats.
// The property name 'ECO_NAME' is the same in this new dataset.
var westernGhatsFilter = ee.Filter.or(
  ee.Filter.stringContains('ECO_NAME', 'North Western Ghats'),
  ee.Filter.stringContains('ECO_NAME', 'South Western Ghats')
);
var westernGhatsBoundary = ecoregions.filter(westernGhatsFilter);

// 3. Dissolve the individual polygons into a single boundary for efficiency.
var westernGhatsAOI = westernGhatsBoundary.union();

// 4. Add the resulting boundary to the map to visualize it.
Map.addLayer(westernGhatsAOI, {color: 'FF0000'}, 'Western Ghats AOI');

// 5. Center the map view on our area of interest.
Map.centerObject(westernGhatsAOI, 6);

// 6. Print the object to the console to inspect its properties.
print('Western Ghats AOI:', westernGhatsAOI);

// =================================================================================
// Step (Utility): Calculate the Exact Area of the Study Region
// =================================================================================

// 1. Calculate the area in square meters.
// We use .geometry() to be explicit and .area() with a maxError for accuracy.
var areaInMeters = westernGhatsAOI.geometry().area(100);

// 2. Convert to square kilometers.
var areaInKm2 = ee.Number(areaInMeters).divide(1000000);

// 3. (THE FIX) Use .evaluate() to safely print the server-side number.
// This is the most robust way to get a computed value from the server.
areaInKm2.evaluate(function(result, error) {
  if (error) {
    print('Error calculating area:', error);
  } else {
    print('Calculated Area of Western Ghats (in square kilometers):', result);
  }
});

// =================================================================================
// Step 2 (Corrected): Load DEM and Derive Terrain Factors (Elevation, Slope, Aspect)
// =================================================================================

// 1. Load the SRTM Digital Elevation Model. This is an ee.Image (raster data).
// =================================================================================
// Step 2 (Corrected): Load DEM and Derive Terrain Factors (Elevation, Slope, Aspect)
// =================================================================================

// 1. Load the SRTM Digital Elevation Model. This is an ee.Image (raster data).
var dem = ee.Image('USGS/SRTMGL1_003');

// 2. Clip the global DEM to our specific Area of Interest.
var dem_AOI = dem.clip(westernGhatsAOI);

// 3. Use the ee.Terrain algorithm to calculate Slope from the DEM.
var slope_AOI = ee.Terrain.slope(dem_AOI);

// 4. Use the ee.Terrain algorithm to calculate Aspect from the DEM.
var aspect_AOI = ee.Terrain.aspect(dem_AOI);

// 5. Define NEW visualization parameters with new colors.
// We'll use a "Spectral" ramp for elevation: Blue (low) -> Green -> Yellow -> Red (high)
var elevationVis = {
  min: 0,
  max: 2500,
  palette: ['#2b83ba', '#abdda4', '#ffffbf', '#fdae61', '#d7191c']
};

// We'll use a sequential Yellow-to-Red palette for slope: Yellow (flat) -> Red (steep)
var slopeVis = {
  min: 0,
  max: 60,
  palette: ['#ffffd4', '#fed98e', '#fe9929', '#d95f0e', '#993404']
};

// We'll use a "four-corner" palette for Aspect: N(Red), E(Yellow), S(Green), W(Blue)
var aspectVis = {
  min: 0,
  max: 360,
  palette: ['#FF0000', '#FFFF00', '#00FF00', '#0000FF', '#FF0000']
};

// 6. Add the new layers to the map.
Map.addLayer(dem_AOI, elevationVis, 'Elevation', false);
Map.addLayer(slope_AOI, slopeVis, 'Slope', false);
Map.addLayer(aspect_AOI, aspectVis, 'Aspect', false);

// 7. Print the new image objects to the console.
print('Clipped DEM:', dem_AOI);
print('Slope:', slope_AOI);
print('Aspect:', aspect_AOI);

// =================================================================================
// Step 2b: Add a Legend to the Map
// =================================================================================

// --- Create the main Legend Panel ---
var legendPanel = ui.Panel({
  style: {
    position: 'bottom-left',
    padding: '8px 15px',
    border: '1px solid black'
  }
});

var legendTitle = ui.Label({
  value: 'Legend',
  style: {fontWeight: 'bold', fontSize: '18px', margin: '0 0 4px 0', padding: '0'}
});
legendPanel.add(legendTitle);

// --- Helper function to create a labeled color box ---
var makeLegendEntry = function(color, label) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      // Use padding to give the box height and width.
      padding: '8px',
      margin: '0 0 4px 0',
      border: '1px solid grey'
    }
  });
  var description = ui.Label({
    value: label,
    style: {margin: '0 0 4px 6px'}
  });
  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

// --- 1. Elevation Legend ---
legendPanel.add(ui.Label({value: 'Elevation (m)', style: {fontWeight: 'bold'}}));
var elevPalette = elevationVis.palette;
legendPanel.add(makeLegendEntry(elevPalette[0], '0 (Low)'));
legendPanel.add(makeLegendEntry(elevPalette[2], '1250 (Mid)'));
legendPanel.add(makeLegendEntry(elevPalette[4], '2500 (High)'));

// --- 2. Slope Legend ---
legendPanel.add(ui.Label({value: 'Slope (°)', style: {fontWeight: 'bold'}}));
var slopePalette = slopeVis.palette;
legendPanel.add(makeLegendEntry(slopePalette[0], '0 (Flat)'));
legendPanel.add(makeLegendEntry(slopePalette[2], '30 (Mid)'));
legendPanel.add(makeLegendEntry(slopePalette[4], '60 (Steep)'));

// --- 3. Aspect Legend ---
legendPanel.add(ui.Label({value: 'Aspect (Direction)', style: {fontWeight: 'bold'}}));
legendPanel.add(makeLegendEntry('#FF0000', 'North'));
legendPanel.add(makeLegendEntry('#FFFF00', 'East'));
legendPanel.add(makeLegendEntry('#00FF00', 'South'));
legendPanel.add(makeLegendEntry('#0000FF', 'West'));

// --- Add the legend to the map ---
ui.root.add(legendPanel);





// =================================================================================
// Step 3: Derive Vegetation Cover using NDVI from Sentinel-2 Imagery
// =================================================================================

// 1. Define parameters for our image query.
var START_DATE = '2023-06-01';
var END_DATE = '2025-09-30';

// 2. Load the Sentinel-2 Level-2A (Surface Reflectance) image collection.
var s2 = ee.ImageCollection('COPERNICUS/S2_SR_HARMONIZED');

// 3. Filter the collection.
var filtered_s2 = s2
  .filter(ee.Filter.bounds(westernGhatsAOI))
  .filter(ee.Filter.date(START_DATE, END_DATE))
  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 20));

// 4. Create a cloud masking function.
function maskS2clouds(image) {
  var scl = image.select('SCL');
  var desiredPixels = scl.eq(4).or(scl.eq(5)).or(scl.eq(6)).or(scl.eq(7));
  return image.updateMask(desiredPixels);
}

// 5. Create a function to calculate NDVI.
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI');
  return image.addBands(ndvi);
}

// 6. Apply the functions and create a composite.
var s2_processed = filtered_s2
  .map(maskS2clouds)
  .map(addNDVI);

var ndvi_AOI = s2_processed.select('NDVI').median().clip(westernGhatsAOI);

// 7. Define a NEW visualization palette for NDVI.
// This is a colorblind-safe brown (bare) -> yellow (low) -> green (high) ramp.
var ndviVis = {
  min: 0,
  max: 0.8,
  palette: ['#a6611a', '#dfc27d', '#f5f5f5', '#80cdc1', '#018571']
};

// 8. Add the final NDVI layer to the map.
Map.addLayer(ndvi_AOI, ndviVis, 'NDVI', false);

// 9. Print the final NDVI image to the console.
print('NDVI Composite:', ndvi_AOI);







// =================================================================================
// Step 4 (Corrected): Derive Rainfall and River Proximity Factors
// =================================================================================

// --- Part A: Maximum 24-Hour Rainfall ---

var chirps = ee.ImageCollection('UCSB-CHG/CHIRPS/DAILY');
var rainfall = chirps.filter(ee.Filter.date('2015-01-01', '2025-10-31'));
var maxRainfall = rainfall.max();
var maxRainfall_AOI = maxRainfall.clip(westernGhatsAOI);

// 4. Define a NEW visualization palette for rainfall.
// This is a sequential blue ramp (light = low rain, dark = high rain).
var rainfallVis = {
  min: 50,
  max: 400,
  palette: ['#eff3ff', '#bdd7e7', '#6baed6', '#3182bd', '#08519c']
};

Map.addLayer(maxRainfall_AOI, rainfallVis, 'Max 24-Hour Rainfall', false);
print('Max Rainfall Image:', maxRainfall_AOI);

// --- Part B: Distance to Rivers (CORRECTED LOGIC) ---

var rivers = ee.FeatureCollection('WWF/HydroSHEDS/v1/FreeFlowingRivers');
var rivers_AOI = rivers.filter(ee.Filter.bounds(westernGhatsAOI));
var distanceToRiver = rivers_AOI.distance({
  searchRadius: 50000,
  maxError: 10
});
var distanceToRiver_AOI = distanceToRiver.clip(westernGhatsAOI);

// 4. Define a NEW visualization palette for distance.
// This is a diverging ramp: Red (close/high risk) -> White (mid) -> Blue (far/low risk).
var distanceVis = {
  min: 0,
  max: 10000,
  palette: ['#d7191c', '#fdae61', '#ffffbf', '#abdda4', '#2b83ba']
};

Map.addLayer(distanceToRiver_AOI, distanceVis, 'Distance to River', false);
print('Distance to River Image:', distanceToRiver_AOI);










// =================================================================================
// Step 5: Add a Legend for the Dynamic Layers
// =================================================================================

// --- Create the main Legend Panel for Dynamic Layers ---
var legendPanel2 = ui.Panel({
  style: {
    position: 'bottom-right', // Place it in the bottom-right corner
    padding: '8px 15px',
    border: '1px solid black'
  }
});

var legendTitle2 = ui.Label({
  value: 'Legend (Dynamic Layers)',
  style: {fontWeight: 'bold', fontSize: '18px', margin: '0 0 4px 0', padding: '0'}
});
legendPanel2.add(legendTitle2);

// --- Helper function (we can reuse the one from Step 2 if it's in the same scope,
// but for clarity, we define it here again) ---
var makeLegendEntry = function(color, label) {
  var colorBox = ui.Label({
    style: {
      backgroundColor: color,
      padding: '8px',
      margin: '0 0 4px 0',
      border: '1px solid grey'
    }
  });
  var description = ui.Label({
    value: label,
    style: {margin: '0 0 4px 6px'}
  });
  return ui.Panel({
    widgets: [colorBox, description],
    layout: ui.Panel.Layout.Flow('horizontal')
  });
};

// --- 1. NDVI Legend ---
legendPanel2.add(ui.Label({value: 'NDVI (Vegetation)', style: {fontWeight: 'bold'}}));
var ndviPalette = ndviVis.palette;
legendPanel2.add(makeLegendEntry(ndviPalette[0], '0.0 (Bare)'));
legendPanel2.add(makeLegendEntry(ndviPalette[2], '0.4 (Sparse)'));
legendPanel2.add(makeLegendEntry(ndviPalette[4], '0.8 (Dense)'));

// --- 2. Rainfall Legend ---
legendPanel2.add(ui.Label({value: 'Max 24h Rainfall (mm)', style: {fontWeight: 'bold'}}));
var rainPalette = rainfallVis.palette;
legendPanel2.add(makeLegendEntry(rainPalette[0], '50 (Low)'));
legendPanel2.add(makeLegendEntry(rainPalette[2], '225 (Mid)'));
legendPanel2.add(makeLegendEntry(rainPalette[4], '400 (High)'));

// --- 3. Distance to River Legend ---
legendPanel2.add(ui.Label({value: 'Distance to River (m)', style: {fontWeight: 'bold'}}));
var distPalette = distanceVis.palette;
legendPanel2.add(makeLegendEntry(distPalette[0], '0 (Close)'));
legendPanel2.add(makeLegendEntry(distPalette[2], '5,000 (Mid)'));
legendPanel2.add(makeLegendEntry(distPalette[4], '10,000 (Far)'));

// --- Add the second legend to the map ---
ui.root.add(legendPanel2);





// =================================================================================
// Step 5: Normalization and Reclassification of Factors
//
// Goal: Convert all factor layers to a common, unitless "Vulnerability Scale"
// from 0 (lowest vulnerability) to 1 (highest vulnerability).
// =================================================================================

// --- 1. Normalize Layers with an INVERSE relationship to flood risk ---
// (Higher value = lower risk)

// Elevation: Low elevation is high risk.
var elevation_vuln = dem_AOI.unitScale(0, 2500).multiply(-1).add(1);

// Slope: Low slope (flat) is high risk.
var slope_vuln = slope_AOI.unitScale(0, 60).multiply(-1).add(1);

// NDVI: Low NDVI (no vegetation) is high risk.
var ndvi_vuln = ndvi_AOI.unitScale(0, 1).multiply(-1).add(1);

// Distance to River: Low distance (close) is high risk.
var distance_vuln = distanceToRiver_AOI.unitScale(0, 10000).multiply(-1).add(1);


// --- 2. Normalize Layers with a DIRECT relationship to flood risk ---
// (Higher value = higher risk)

// Max Rainfall: High rainfall is high risk.
var rainfall_vuln = maxRainfall_AOI.unitScale(50, 400);


// --- 3. Reclassify Layers with a NON-LINEAR relationship to flood risk ---

// Aspect: West-facing slopes are high risk, North is medium, others are low.
var aspect_rad = aspect_AOI.multiply(Math.PI / 180);

// Convert our "peak risk" direction (West, 270°) to radians
var west_rad = ee.Number(270 * Math.PI / 180);

// Calculate the cosine of the difference from West.
// This gives a range from -1 (East/safest) to +1 (West/riskiest).
var cos_similarity_to_west = aspect_rad.subtract(west_rad).cos();

// Normalize the -1 to +1 range to our final 0 to 1 vulnerability scale.
// Formula: (value + 1) / 2
var aspect_vuln = cos_similarity_to_west.add(1).divide(2);


// --- 4. Visualization and Inspection ---

// Define a consistent visualization palette for all vulnerability layers.
// Black will be low vulnerability (0), and White will be high vulnerability (1).
var vulnVis = {min: 0, max: 1, palette: ['#000000', '#FFFFFF']};

// Add the new normalized layers to the map for verification.
Map.addLayer(elevation_vuln.clip(westernGhatsAOI), vulnVis, 'Elevation Vulnerability', false);
Map.addLayer(slope_vuln.clip(westernGhatsAOI), vulnVis, 'Slope Vulnerability', false);
Map.addLayer(aspect_vuln.clip(westernGhatsAOI), vulnVis, 'Aspect Vulnerability', false);
Map.addLayer(ndvi_vuln.clip(westernGhatsAOI), vulnVis, 'NDVI Vulnerability', false);
Map.addLayer(rainfall_vuln.clip(westernGhatsAOI), vulnVis, 'Rainfall Vulnerability', false);
Map.addLayer(distance_vuln.clip(westernGhatsAOI), vulnVis, 'Distance Vulnerability', false);

// Print one of the new layers to the console to check its structure.








// =================================================================================
// Step 6 (Definitive Final Version): PCA, FSI Calculation, and Optimized SAR Validation
// =================================================================================

// --- PART A: DEFINE HELPER FUNCTIONS ---

var calculateFSI = function(pcaInput, bandNames, weightsList) {
  var weightsImage = ee.Image.constant(weightsList).rename(bandNames);
  var fsi = pcaInput.multiply(weightsImage)
    .expression('b(0) + b(1) + b(2) + b(3) + b(4) + b(5)');

  var fsiVis = {min: 0, max: 1, palette: ['#2c7bb6', '#abd9e9', '#ffffbf', '#fdae61', '#d7191c']};
  Map.addLayer(fsi.clip(westernGhatsAOI), fsiVis, 'Flood Susceptibility Index');
  print('SUCCESS: Flood Susceptibility Index map has been calculated and added.');

  // =================================================================================
  // --- NEW LEGEND CODE STARTS HERE ---
  // =================================================================================

  // Helper function to create a labeled color box for the legend
  var makeLegendEntry = function(color, label) {
    var colorBox = ui.Label({
      style: {
        backgroundColor: color,
        padding: '8px',
        margin: '0 0 4px 0',
        border: '1px solid grey'
      }
    });
    var description = ui.Label({
      value: label,
      style: {margin: '0 0 4px 6px'}
    });
    return ui.Panel({
      widgets: [colorBox, description],
      layout: ui.Panel.Layout.Flow('horizontal')
    });
  };

  // Create the legend panel, positioned in the top-right
  var legendPanel = ui.Panel({
    style: {
      position: 'top-right',
      padding: '8px 15px',
      border: '1px solid black'
    }
  });

  var legendTitle = ui.Label({
    value: 'Flood Susceptibility Index',
    style: {fontWeight: 'bold', fontSize: '16px', margin: '0 0 4px 0', padding: '0'}
  });
  legendPanel.add(legendTitle);

  // Add the color entries, matching the fsiVis palette
  var palette = fsiVis.palette;
  legendPanel.add(makeLegendEntry(palette[0], '0.0 (Low Susceptibility)'));
  legendPanel.add(makeLegendEntry(palette[2], '0.5 (Medium)'));
  legendPanel.add(makeLegendEntry(palette[4], '1.0 (High Susceptibility)'));
  
  // Add the completed legend to the map
  ui.root.add(legendPanel);

  // =================================================================================
  // --- NEW LEGEND CODE ENDS HERE ---
  // =================================================================================
  
  return fsi;
};
var runRobustSarValidation = function(fsi) {
  print('--- Starting Robust SAR Validation (Kerala Region) ---');
  
  var keralaRegion = ee.Geometry.Rectangle([75.5, 8.5, 77.5, 12.5]);
  
  // 1. Load Sentinel-1 data
  var s1 = ee.ImageCollection('COPERNICUS/S1_GRD')
      .filterBounds(keralaRegion)
      .filter(ee.Filter.listContains('transmitterReceiverPolarisation', 'VV'))
      .filter(ee.Filter.eq('instrumentMode', 'IW'))
      .select('VV');

  var before = s1.filterDate('2018-05-01', '2018-05-31').median();
  var after = s1.filterDate('2018-08-18', '2018-08-25').median();
  
  // 2. Apply speckle filter
  var radius = 50;
  var beforeFiltered = before.focal_median(radius, 'circle', 'meters');
  var afterFiltered = after.focal_median(radius, 'circle', 'meters');
  
  // 3. Calculate ratio (before/after)
  var ratio = beforeFiltered.divide(afterFiltered);
  
  // 4. Threshold ratio to find floods
  var RATIO_THRESHOLD = 1.5;
  var floodExtent = ratio.gt(RATIO_THRESHOLD).rename('flood');
  
  Map.centerObject(keralaRegion, 8);
  Map.addLayer(floodExtent.selfMask(), {palette: '0000FF'}, 'SAR Flood Extent (Ratio Method)');
  
  // 5. (THE FIX) Perform statistical validation at a coarser scale to prevent timeout.
  var validationImage = fsi.addBands(floodExtent);
  var stats = validationImage.reduceRegion({
    reducer: ee.Reducer.mean().group({ 
       groupField: 1, 
       groupName: 'flood_class' 
     }),
    geometry: keralaRegion,
    scale: 300, // Increased scale from 90 to 300 to reduce computational load
    maxPixels: 1e10,
    bestEffort: true
  });
  
  print('=== SAR VALIDATION RESULTS (Ratio Method) ===');
  print(stats);
};


// --- PART B: RUN THE MAIN ANALYSIS ---

var bandNames = ['elevation', 'slope', 'aspect', 'ndvi', 'rainfall', 'distance'];
var pcaInput = ee.Image.cat([
  elevation_vuln, slope_vuln, aspect_vuln, ndvi_vuln, rainfall_vuln, distance_vuln
]).rename(bandNames);

var samplingPoints = ee.FeatureCollection.randomPoints({region: westernGhatsAOI, points: 5000, seed: 42});
var sample = pcaInput.sampleRegions({collection: samplingPoints, scale: 1000, geometries: false});
var arrayFeatures = sample.map(function(feature) {
  var array = ee.Array(bandNames.map(function(band) { return feature.getNumber(band); }));
  return ee.Feature(null, {array: array});
});
var covariance = arrayFeatures.reduceColumns({reducer: ee.Reducer.covariance(), selectors: ['array']});
var covArray = ee.Array(covariance.get('Covariance'));
var eigens = covArray.eigen();






// =================================================================================
// Step 7: Hotspot Analysis (Getis-Ord Gi*) in GEE
// =================================================================================

var performHotspotAnalysis = function(fsi) {
  print('--- Starting Hotspot Analysis ---');
var keralaRegion = ee.Geometry.Rectangle([75.5, 8.5, 77.5, 12.5]);
  Map.addLayer(keralaRegion, {color: 'yellow'}, 'Kerala Rectangle');
  Map.centerObject(keralaRegion, 7);
  // 1. Define the neighborhood for the analysis.
  var radius = 5000; // 5 kilometers in meters

  // 2. Calculate the local mean for each pixel.
  var focalMean = fsi.focalMean({
    radius: radius,
    units: 'meters',
    kernelType: 'circle'
  });
  
  // 3. Calculate standard deviation using reduceNeighborhood
  var focalStdDev = fsi.reduceNeighborhood({
    reducer: ee.Reducer.stdDev(),
    kernel: ee.Kernel.circle({radius: radius, units: 'meters'})
  });

  // 4. Calculate the Getis-Ord Gi* statistic (Z-score).
  var giStar = fsi.subtract(focalMean).divide(focalStdDev);

  // 5. Define visualization for the continuous Z-score map.
  var giStarVis = {
    min: -3, max: 3,
    palette: ['0000FF', '8888FF', 'FFFFFF', 'FFAA00', 'FF0000']
  };
  
  Map.addLayer(giStar.clip(westernGhatsAOI), giStarVis, 'Gi* Z-scores', false);

  // 6. Classify the Z-scores into significant hotspots and coldspots.
  var hotspots_99 = giStar.gt(2.58); // 99% confidence
  var hotspots_95 = giStar.gt(1.96).and(giStar.lte(2.58)); // 95% confidence
  var coldspots_95 = giStar.lt(-1.96); // 95% confidence coldspot

  // 7. Add the classified hotspot/coldspot layers to the map.
  Map.addLayer(hotspots_99.selfMask().clip(westernGhatsAOI), 
               {palette: ['8B0000']}, 
               'Hotspots (99% confidence)', 
               true);
  Map.addLayer(hotspots_95.selfMask().clip(westernGhatsAOI), 
               {palette: ['FF0000']}, 
               'Hotspots (95% confidence)', 
               true);
  Map.addLayer(coldspots_95.selfMask().clip(westernGhatsAOI), 
               {palette: ['0000FF']}, 
               'Coldspots (95% confidence)', 
               false);
  
  
  // 8. Add known flood cities for validation
  var floodCities = ee.FeatureCollection([
    ee.Feature(ee.Geometry.Point([75.37, 11.87]), {name: 'Kozhikode'}),
    ee.Feature(ee.Geometry.Point([76.27, 9.93]), {name: 'Kochi'}),
    ee.Feature(ee.Geometry.Point([75.52, 11.25]), {name: 'Malappuram'}),
    ee.Feature(ee.Geometry.Point([76.33, 10.53]), {name: 'Thrissur'}),
    ee.Feature(ee.Geometry.Point([74.85, 12.87]), {name: 'Mangalore'}),
    ee.Feature(ee.Geometry.Point([74.01, 16.71]), {name: 'Kolhapur'}),
  ]);
  
  Map.addLayer(floodCities, {color: 'FFFF00'}, 'Known Flood Cities', true);
  
  print('');
  print('=== HOTSPOT ANALYSIS COMPLETE ===');
  print('SUCCESS: Hotspot analysis complete. New layers added to the map.');
  print('');
  print('INTERPRETATION:');
  print('- DARK RED (99%): Critical priority flood hotspot clusters');
  print('- RED (95%): High priority flood hotspot clusters');
  print('- BLUE: Low risk coldspot clusters');
  print('- YELLOW DOTS: Known historically flooded cities for validation');
  print('');
  print('These hotspots show SPATIAL AUTOCORRELATION:');
  print('High flood risk areas SURROUNDED by other high risk areas.');
  print('Use Inspector tool to check if yellow markers overlap with hotspots.');
  
};
eigens.evaluate(function(eigensClient, error) {
  if (error || !eigensClient) {
     print('Error in eigen analysis:', error);
     return;
   }
  
  var pc1 = eigensClient[0].slice(1);
  var absWeights = pc1.map(function(val) { return Math.abs(val); });
  var sum = absWeights.reduce(function(a, b) { return a + b; }, 0);
  var weights = absWeights.map(function(val) { return val / sum; });
  
  var weightsDict = {};
  for (var i = 0; i < bandNames.length; i++) {
     weightsDict[bandNames[i]] = weights[i];
   }
  print('PCA-Derived Weights (FINAL):', weightsDict);

  var final_fsi = calculateFSI(pcaInput, bandNames, weights);
  runRobustSarValidation(final_fsi);
  performHotspotAnalysis(final_fsi);  // ADD THIS LINE!
});

// =============================================================
// Step 8: Validation of Hotspots with Real Flood Extent (SAR)
// =============================================================
var validateHotspots = function(hotspots_99, floodExtent, keralaRegion) {
  print('--- Starting Hotspot Validation ---');

  // Reproject both layers to the same scale and CRS for comparison
  hotspots_99 = hotspots_99.reproject({crs: 'EPSG:4326', scale: 300});
  floodExtent = floodExtent.reproject({crs: 'EPSG:4326', scale: 300});

  // Intersection (pixels that are both hotspot and flooded)
  var intersection = hotspots_99.and(floodExtent);

  // Compute pixel-wise area statistics
  var stats = ee.Image.cat(hotspots_99, floodExtent, intersection)
    .rename(['hotspot', 'flood', 'intersection'])
    .reduceRegion({
      reducer: ee.Reducer.sum(),
      geometry: keralaRegion,
      scale: 300,
      maxPixels: 1e10
    });

  print('=== HOTSPOT VALIDATION RESULTS ===');
  print(stats);

  // Calculate percentage overlap
  stats.evaluate(function(result) {
    var hotspotArea = result.hotspot || 0;
    var floodArea = result.flood || 0;
    var intersectArea = result.intersection || 0;
    var overlapPercent = (intersectArea / floodArea) * 100;
    print('Hotspot area (pixels):', hotspotArea);
    print('Flooded area (pixels):', floodArea);
    print('Intersection area (pixels):', intersectArea);
    print('Percentage of flooded area within hotspots: ' + overlapPercent.toFixed(2) + '%');
  });

  Map.addLayer(intersection.selfMask(), {palette: '00FF00'}, 'Overlap: Hotspot ∩ Flood', true);
  print('SUCCESS: Validation complete. Green = overlap of hotspot & flooded areas.');
};
