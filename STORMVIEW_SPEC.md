# StormView WX - Technical Specification & Feature Documentation

> **Source**: `stormview_mobile_ultra_safe.html`
> **Purpose**: Complete feature specification for React rebuild
> **Version**: Ultra-Safe Restore (Radar-focused build)

---

## 1. APPLICATION OVERVIEW

**StormView WX** is a real-time weather radar and severe weather alert visualization platform. It provides CONUS-wide and station-specific NEXRAD radar imagery, NWS warnings/watches, SPC convective outlooks, and numerical weather prediction models in a single interactive map interface.

### Core Capabilities
- Live NEXRAD radar loop (50-frame replay, 2.4-min intervals)
- 86+ individual NEXRAD station isolation with single-site viewing
- 15 categories of NWS warnings, watches, and statements
- SPC convective outlooks (Day 1/2/3) with risk categories
- HRRR and RRFS-A model reflectivity overlays
- Interactive timeline with variable playback speeds (1x-8x)
- Auto-refresh every 2 minutes (configurable)
- City search with geocoding fallback
- NWS point forecast integration
- Mobile-responsive design with map-first layout

---

## 2. DATA LAYERS & VISUALIZATION

### 2.1 Radar Products

#### Reflectivity (dBZ) - **Primary Layer**
- **Product Code**: N0Q (NEXRAD Level III)
- **Data Range**: -30 to +70 dBZ
- **Color Scale**: 17-level gradient
  - Gray (-30 to 0): No echo
  - Cyan/Blue (5-20): Light rain
  - Green (25-35): Moderate rain
  - Yellow (40-45): Heavy rain
  - Orange (50-55): Very heavy rain
  - Red (60-65): Intense rain/hail
  - Magenta (70+): Extreme reflectivity
- **Default Opacity**: 85%
- **Sources**:
  - CONUS Composite: RainViewer API
  - Single-Site: Iowa State Mesonet NEXRAD Ridge tiles

#### Satellite (Infrared) - **Disabled in Safe Mode**
- **Product**: IR brightness temperature
- **Range**: -80°C to +20°C
- **Note**: Present in UI but disabled in this radar-focused build

#### Velocity - **Disabled**
- **Product**: Doppler radial velocity
- **Range**: -64 to +64 knots
- **Status**: No live feed connected

### 2.2 Model Overlays

#### HRRR REFD (High-Resolution Rapid Refresh)
- **Source**: Iowa State Mesonet tile server
- **URL Template**: `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD/{z}/{x}/{y}.png`
- **Product**: Composite reflectivity forecast
- **Default Opacity**: 70%
- **Z-Index**: 210
- **Toggle Function**: `toggleHRRR()`

#### RRFS-A REFC (Rapid Refresh Forecast System)
- **Source**: Iowa State Mesonet tile server
- **URL Template**: `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/rrfs_refc/{z}/{x}/{y}.png`
- **Product**: Composite reflectivity forecast
- **Default Opacity**: 72%
- **Z-Index**: 215
- **Toggle Function**: `toggleRRFS()`
- **Additional Access**: Embedded WeatherBell panel (iframe)

### 2.3 SPC Convective Outlooks

#### Day 1 Categorical Outlook
- **Source**: `https://www.spc.noaa.gov/products/outlook/day1otlk_cat.nolyr.geojson`
- **Risk Levels**:
  - General Thunder (TSTM) - Green - 10% opacity
  - Marginal (MRGL) - Dark Green - 15% opacity
  - Slight (SLGT) - Yellow - 18% opacity
  - Enhanced (ENH) - Orange - 22% opacity
  - Moderate (MDT) - Red - 25% opacity
  - High (HIGH) - Magenta - 30% opacity
- **Border**: Solid yellow stroke
- **Z-Index**: 390

#### Day 2 Categorical Outlook
- **Source**: `https://www.spc.noaa.gov/products/outlook/day2otlk_cat.nolyr.geojson`
- **Risk Levels**: Probabilistic (10%, 15%, 30%, 45%)
- **Border**: Dashed orange stroke (`dashArray: '6,4'`)
- **Z-Index**: 390

#### Day 3 Categorical Outlook
- **Source**: `https://www.spc.noaa.gov/products/outlook/day3otlk_cat.nolyr.geojson`
- **Risk Levels**: Probabilistic (10%, 15%, 30%, 45%)
- **Border**: Dashed red stroke (`dashArray: '4,6'`)
- **Z-Index**: 390

**Interaction**: Click on outlook area to highlight with pulsing stroke animation

---

## 3. WEATHER ALERTS SYSTEM

### 3.1 Alert Type Definitions

| Alert Type | Abbrev | Color | Fill Opacity | Z-Index | Border Pattern | Blinking |
|------------|--------|-------|--------------|---------|----------------|----------|
| Tornado Warning | TOR | #ff2020 (Red) | 22% | 500 | Solid | Yes |
| Severe T-Storm Warning | SVR | #ff8800 (Orange) | 18% | 400 | 6,4 dash | No |
| Tornado Watch | TWA | #ffff00 (Yellow) | 12% | 300 | 8,5 dash | No |
| Severe T-Storm Watch | SWA | #dbdb00 (Dark Yellow) | 12% | 300 | 8,5 dash | No |
| Mesoscale Discussion | MCD | #cc77ff (Purple) | 15% | 350 | 4,4 dash | No |
| Flash Flood Warning | FF | #00cc44 (Green) | 16% | 380 | 5,5 dash | No |
| Flood Alerts | FLD | #00e0a0 (Cyan-Green) | 14% | 360 | 5,4 dash | No |
| Winter Weather | WS | #ff69b4 (Pink) | 13% | 280 | 4,6 dash | No |
| Special Weather Statement | SPS | #ffd166 (Gold) | 10% | 395 | 3,3 dash | No |
| Special Marine Warning | SMW | #00b4ff (Light Blue) | 17% | 390 | 4,3 dash | No |
| Heat Alerts | HEAT | #ff5e5e (Light Red) | 12% | 275 | 2,4 dash | No |
| Fire Weather | FIRE | #ff7b00 (Orange) | 11% | 275 | 6,3 dash | No |
| Wind Alerts | WIND | #8fd3ff (Light Blue) | 11% | 275 | 5,3 dash | No |
| Marine Alerts | MAR | #4dd0e1 (Cyan) | 11% | 275 | 5,3 dash | No |
| Other NWS | GEN | #b0bec5 (Gray) | 7% | 250 | 3,4 dash | No |

### 3.2 Alert Data Sources

#### NWS Active Alerts API
- **Endpoint**: `https://api.weather.gov/alerts/active`
- **Query Params**: `?status=actual&message_type=alert,update`
- **Format**: GeoJSON FeatureCollection
- **Headers Required**:
  - `User-Agent: StormView-WX/1.0`
  - `Accept: application/geo+json`
- **Timeout**: 15 seconds
- **Refresh Interval**: 60 seconds (auto-refresh enabled)

#### SPC Active Watches
- **Endpoint**: `https://www.spc.noaa.gov/products/watch/ActiveWW.geojson`
- **Contains**: Tornado watches (TWA), Severe T-Storm watches (SWA)
- **Timeout**: 8 seconds

#### SPC Mesoscale Discussions
- **Endpoint**: `https://www.spc.noaa.gov/products/md/ActiveMD.geojson`
- **Contains**: Active MCDs with convective analysis
- **Timeout**: 8 seconds

### 3.3 Alert Features & Interactions

#### Polygon Rendering
- **Fill**: Semi-transparent color (base opacity × warning opacity slider)
- **Stroke**: Solid or dashed based on type
- **Stroke Width**: 2px
- **Stroke Opacity**: 85%

#### Centroid Labels
- **Applied To**: TOR, TWA, SWA, MCD
- **Content**: Event type abbreviation
- **Style**: White text, semi-transparent dark background
- **Blinking**: Only for TOR (1.8s cycle)

#### Hover Tooltips
- **Content**: Event name, expiration time, areas affected
- **Style**: Dark background, cyan border, monospace font
- **Positioning**: Auto-adjust to prevent clipping

#### Click Actions
1. Open detailed warning card overlay
2. Populate card with:
   - Event type (color-coded header)
   - Expiration time
   - Affected areas
   - Hazard/Source/Impact sections (parsed)
   - Full description (truncated to 800 chars)
   - Instructions (highlighted in red box)
3. Pan map to warning centroid

#### Right-Click Actions
- Open full NWS statement in new browser tab
- URL format: `https://forecast.weather.gov/wwamap/wwatxtget.php?cwa=${cwa}&wwa=${event}`

#### Alert List (Left Panel)
- **Display Limit**: 18 alerts
- **Sorting**: By type priority (TOR → SVR → TWA → ... → GEN)
- **Format**: Color dot + event name + area + expiration
- **Overflow**: Show "+N more" if alerts > 18
- **Click Action**: Zoom to alert + switch to nearest NEXRAD station

### 3.4 Tornado Banner

**Trigger Conditions**: Any active TOR alerts

**Banner Content**:
```
⚠ [N] TORNADO WARNING[S] ACTIVE — TAKE SHELTER NOW ⚠
```

**Styling**:
- Position: Top of map (52px from top on desktop, 92px on mobile)
- Background: Dark red (`rgba(30,0,0,.97)`)
- Border: 2px solid red (`#ff2020`)
- Animation: 1s pulsing border/text color
- Box shadow: Red glow effect
- Z-Index: 700

**Behavior**:
- Auto-show when TOR count > 0
- Auto-hide after 20 seconds
- Header alert icon blinks in sync

---

## 4. TIMELINE & ANIMATION

### 4.1 Frame Management

#### RainViewer API Integration
- **Endpoint**: `https://api.rainviewer.com/public/weather-maps.json`
- **Response Structure**:
  ```json
  {
    "radar": {
      "past": [
        {"time": 1234567890, "path": "/data/..."},
        ...
      ]
    },
    "host": "https://tilecache.rainviewer.com"
  }
  ```
- **Frame Count Options**: 5, 7, 14, 30, 50
- **Default**: 50 frames (~2 hours of history at 2.4-min intervals)

#### Frame Loading Strategy
1. Fetch frame metadata from RainViewer API
2. Take last N frames (where N = frameCount)
3. Build tile URLs: `${host}${path}/256/{z}/{x}/{y}/8/1_1.png`
4. Create Leaflet tile layers for each frame (lazy loading)
5. Cache layers in `radLayers` object

#### Single-Site NEXRAD Frames
- **Source**: Iowa State Mesonet
- **URL Pattern**: `https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::${code}-N0Q-0/{z}/{x}/{y}.png`
- **Station Codes**: KLBB, KAMA, KFWS, etc. (86 total)
- **Frame Availability**: Latest + 50-frame replay
- **Note**: No timestamps provided; relies on IEM's internal caching

### 4.2 Playback Controls

#### Play/Pause Toggle
- **Button**: Play/Pause icon (▶/⏸)
- **State Variable**: `playing` (boolean)
- **Function**: `togglePlay()`
- **Behavior**:
  - Play: Start `animLoop()` with `requestAnimationFrame`
  - Pause: Cancel animation frame, freeze at current frame

#### Step Controls
- **Previous Button**: Decrement `fIdx` by 1 (wrap to end if at 0)
- **Next Button**: Increment `fIdx` by 1 (wrap to start if at end)
- **Function**: `advanceFrame(dir)` where dir = -1 or +1

#### Speed Control
- **Options**: 1x, 2x, 3x, 4x, 5x, 6x, 7x, 8x
- **Default**: 3x
- **UI**: Dropdown selector
- **Effect**: Modifies frame delay = `800ms / speed`
- **Update Function**: `setSpeed(s)`

#### Frame Count Selector
- **Options**: 5, 7, 14, 30, 50 frames
- **Buttons**: Horizontal row in Loop Playback section
- **Effect**: Triggers full radar reload via `loadRadar()`
- **Update Function**: `setFrameCount(n)`

### 4.3 Timeline UI

#### Interactive Timeline Bar
- **Visual**: Horizontal gradient bar (blue to cyan)
- **Width**: 220px (desktop), 120px (mobile)
- **Ticks**: One per frame (visual indicator)
- **Draggable Head**: Current frame position indicator
- **Click-to-Seek**: Click anywhere on bar to jump to frame
- **Calculation**: `frameIndex = Math.round(clickPercent * (frameCount - 1))`

#### Time Display Chip
- **Format**: "HH:MMZ" (UTC) or "LIVE" for latest frame
- **Source**: Frame timestamp from RainViewer or IEM
- **Fallback**: "LIVE" if timestamp unavailable

#### Station Indicator Chip
- **Format**: "CONUS" or station code (e.g., "KLBB")
- **Color**: Cyan background if active station

### 4.4 Auto-Refresh System

#### Configuration
- **Toggle**: AUTO button in right panel
- **Default State**: ON
- **Interval**: 120,000ms (2 minutes)
- **Function**: `startRadarAutoRefresh()`

#### Refresh Logic
1. Fetch latest RainViewer metadata
2. Compare newest frame timestamp to cached
3. If new frames available:
   - Clear `radLayers` cache
   - Rebuild radar with latest frames
   - Update "Updated HH:MMZ" timestamp in header
   - Show spinner + status message
4. If no new frames:
   - No UI change (silent check)

#### Manual Refresh
- **Button**: "↺ Now" in right panel
- **Effect**: Immediate radar reload via `loadRadar()`
- **Status**: Shows spinner + "Reloading radar..."

---

## 5. MAP INTERACTIONS & CONTROLS

### 5.1 Base Map Configuration

#### Tile Layer
- **Provider**: CartoDB Dark All
- **URL**: `https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`
- **Attribution**: `© CartoDB`
- **Z-Index**: 100
- **Background Color**: `#06090f` (very dark blue)

#### Map Initialization
```javascript
map = L.map('map', {
  center: [38, -96],       // Central CONUS
  zoom: 5,
  zoomControl: false,      // Custom zoom controls
  attributionControl: false
})
```

#### Custom Map Panes (Z-Index Hierarchy)
- **baseLabels**: 350 (city labels, pointer-events: none)
- **boundaries**: 360 (WMS overlays - county/state/CWA)
- **outlook**: 390 (SPC GeoJSON polygons)
- **Default layers**: 200+

### 5.2 Reference Overlays

#### County Borders
- **Source**: NWS WMS Reference Maps
- **Layer ID**: 2
- **Opacity**: 42%
- **Color**: Faint lines matching `--brd` color
- **Toggle**: "County Borders" button in Map Overlays section
- **State Variable**: `overlayVis.county`

#### State Borders
- **Source**: NWS WMS Reference Maps
- **Layer ID**: 3
- **Opacity**: 72%
- **Color**: Stronger lines than counties
- **Toggle**: "State Borders" button in Map Overlays section
- **State Variable**: `overlayVis.state`

#### CWA Borders (NWS Forecast Office Boundaries)
- **Source**: NWS WMS Reference Maps
- **Layer ID**: 1
- **Opacity**: 55%
- **Color**: Dashed lines
- **Toggle**: "NWS CWA Borders" button in Map Overlays section
- **State Variable**: `overlayVis.cwa`

#### WMS Configuration
- **Base URL**: `https://mapservices.weather.noaa.gov/static/services/nws_reference_maps/nws_reference_map/MapServer/WMSServer`
- **Version**: 1.3.0
- **Format**: image/png
- **Transparent**: true
- **CRS**: EPSG:3857 (Web Mercator)

### 5.3 Interactive Markers & Labels

#### City Labels (65+ US Cities)
- **Priority Tiers**:
  - Tier 1 (Always shown): NYC, LA, Chicago, Houston, Phoenix, Philadelphia, San Antonio, San Diego, Dallas, San Jose, Austin, Jacksonville, Fort Worth, Columbus, Charlotte, Detroit, Denver, DC, Boston, Seattle
  - Tier 2 (Medium density): Nashville, Memphis, Portland, OKC, Las Vegas, Louisville, Baltimore, Milwaukee, Albuquerque, Tucson, Fresno, Sacramento, Kansas City, Atlanta, Miami, Cleveland, St. Louis, Pittsburgh, Cincinnati, Minneapolis, Tampa, New Orleans, Indianapolis
  - Tier 3 (High density): Raleigh, Omaha, Colorado Springs, Wichita, Arlington, Bakersfield, Virginia Beach, Oakland, Mesa, Tulsa, Richmond, Lexington
  - Tier 4 (All labels): Buffalo, Corpus Christi, El Paso, Honolulu, Anchorage
- **Font Sizing**: Dynamic based on zoom level (9px to 13px)
- **Styling**: White text with semi-transparent dark background + glow effect
- **Click Action**: Fly to city + zoom to level 10
- **Tooltip**: City name (sticky)

#### NEXRAD Station Dots (86 Stations)
- **Visual**: Small circular markers (6-8px)
- **Colors**:
  - Active Station: Green (`#00ff88`) with 14px glow
  - Inactive: Cyan (`#00d4ff`) with 8px glow
- **Click Action**: Isolate station (enter single-site mode)
- **Tooltip**: Station code + location name
- **Animation**: Pulsing glow on active station
- **Toggle**: Can be hidden via `nexradDotsOn` state

#### Pin Drop (Search Results)
- **Visual**: Custom marker with pointer icon + label
- **Created On**: City search, coordinate search, or map click
- **Tooltip**: Shows coordinates or location name
- **Behavior**: Replaces previous pin (only one at a time)
- **Associated Action**: Fetch NWS point forecast for coordinates

### 5.4 Zoom & Pan Controls

#### Zoom In/Out Buttons
- **Position**: Bottom-right corner (above status bar)
- **Icons**: + / −
- **Actions**: `map.zoomIn()` / `map.zoomOut()`
- **Style**: Dark background, cyan border on hover
- **Mobile**: Larger touch targets (34px vs 28px)

#### FIT Button
- **Label**: "FIT"
- **Action**: Reset view to CONUS
  ```javascript
  map.setView([38, -96], 5)
  ```
- **Use Case**: Quick return to full US view

#### Zoom Level Display
- **Locations**:
  1. Header badge (e.g., "Zoom 5")
  2. Bottom bar (e.g., "Z: 5")
- **Updates**: On `map.on('zoomend')` event
- **Range**: 3 (CONUS overview) to 12 (street level)

### 5.5 Search Functionality

#### Search Input Bar
- **Position**: Top center of map (96px from top on desktop, 52px on mobile)
- **Width**: 340px (desktop), auto (mobile)
- **Placeholder**: "Search city or lat,lon..."
- **Components**:
  - Text input field (`#li`)
  - GO button (`#lbtn`)
  - Suggestions dropdown (`#sg`)

#### Search Methods

**1. City Name Autocomplete**
- **Database**: 65+ pre-indexed cities with coordinates
- **Matching**: Case-insensitive substring search
- **Max Results**: 8 suggestions
- **Trigger**: `input` event (real-time)
- **Selection**: Click suggestion or press Enter
- **Function**: `onSrch()`, `pickSug(name, lat, lon)`

**2. Coordinate Search**
- **Format**: `lat,lon` or `lat, lon`
- **Regex Pattern**: `/(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)/`
- **Example**: `35.2,-97.4` or `35.2, -97.4`
- **Validation**: Accepts negative values (South/West)
- **Action**: Immediate pin drop + fly-to

**3. Geocoding Fallback (OSM Nominatim)**
- **Endpoint**: `https://nominatim.openstreetmap.org/search`
- **Query Params**:
  - `q`: Search term
  - `format`: json
  - `limit`: 1
  - `countrycodes`: us
- **Headers**: `Accept-Language: en`
- **Timeout**: 8 seconds
- **Result**: Top US match with lat/lon

#### Search Result Actions
1. Fly to location (1.2s animation, zoom to 9-10)
2. Drop labeled pin at coordinates
3. Fetch NWS point forecast for location
4. Update "Location" display in right panel

### 5.6 Click & Hover Behaviors

#### Map Click (Non-Marker Area)
- **Action 1**: Drop pin at clicked coordinates
- **Action 2**: Fetch NWS point forecast
- **Action 3**: Display forecast in right panel (6 periods)
- **Function**: `onMapClick(e)`

#### Alert Polygon Click
- **Action 1**: Open warning detail card (#warn-card)
- **Action 2**: Populate card with alert metadata
- **Action 3**: Pan map to alert centroid (no zoom change)
- **Function**: `openWarnCard(alertKey)`

#### Alert Polygon Right-Click
- **Action**: Open NWS statement in new tab
- **URL**: `https://forecast.weather.gov/wwamap/wwatxtget.php?cwa=${cwa}&wwa=${event}`

#### SPC Outlook Polygon Click
- **Action 1**: Highlight with pulsing stroke animation
- **Action 2**: Show console log of clicked feature
- **Function**: `onSpcClick(e)`

#### City Label Click
- **Action**: Fly to city with zoom 10

#### NEXRAD Dot Click
- **Action**: Enter station isolation mode
- **Function**: `setStation(code)`

#### Mouse Move (Over Map)
- **Action**: Update lat/lon displays in header and bottom bar
- **Precision**: 2 decimal places
- **Function**: `onMoveMap(e)`

---

## 6. NEXRAD STATION SYSTEM

### 6.1 Station List (86 Total)

**Full Station Array** (format: `[code, lat, lon, name]`):
```javascript
['KLBB', 33.65, -101.81, 'Lubbock TX'],
['KAMA', 35.23, -101.71, 'Amarillo TX'],
['KFWS', 32.57, -97.30, 'Fort Worth TX'],
['KEWX', 29.70, -98.03, 'Austin/San Antonio TX'],
['KCRP', 27.78, -97.51, 'Corpus Christi TX'],
['KMAF', 31.94, -102.19, 'Midland TX'],
['KSJT', 31.37, -100.49, 'San Angelo TX'],
['KDYX', 32.54, -99.25, 'Dyess AFB TX'],
['KGRK', 30.72, -97.38, 'Fort Hood TX'],
['KBRO', 25.92, -97.42, 'Brownsville TX'],
['KLCH', 30.13, -93.22, 'Lake Charles LA'],
['KSHV', 32.45, -93.84, 'Shreveport LA'],
['KPOE', 31.16, -92.98, 'Fort Polk LA'],
['KLGX', 30.68, -85.99, 'Elgin AFB FL'],
['KTLH', 30.40, -84.33, 'Tallahassee FL'],
['KTBW', 27.71, -82.40, 'Tampa FL'],
['KBYX', 24.60, -81.70, 'Key West FL'],
['KMFL', 25.61, -80.41, 'Miami FL'],
['KJAX', 30.48, -81.70, 'Jacksonville FL'],
['KAMX', 25.61, -80.41, 'Miami (alt) FL'],
['KMLB', 28.11, -80.65, 'Melbourne FL'],
['KEVX', 30.56, -85.92, 'Elgin (alt) FL'],
['KMOB', 30.68, -88.24, 'Mobile AL'],
['KBMX', 33.17, -86.77, 'Birmingham AL'],
['KEOX', 31.46, -85.46, 'Fort Rucker AL'],
['KGWX', 33.90, -88.33, 'Columbus AFB MS'],
['KDGX', 32.28, -89.98, 'Jackson MS'],
['KMXX', 32.54, -85.79, 'Maxwell AFB AL'],
['KHTX', 34.93, -86.08, 'Hytop AL'],
['KOHX', 36.25, -86.56, 'Nashville TN'],
['KNQA', 35.34, -89.87, 'Memphis TN'],
['KMRX', 36.17, -83.40, 'Knoxville TN'],
['KPAH', 37.07, -88.77, 'Paducah KY'],
['KLVX', 37.98, -85.94, 'Louisville KY'],
['KJKL', 37.59, -83.31, 'Jackson KY'],
['KILN', 39.42, -83.82, 'Wilmington OH'],
['KCLE', 41.41, -81.86, 'Cleveland OH'],
['KDTX', 42.70, -83.47, 'Detroit MI'],
['KGRR', 42.89, -85.54, 'Grand Rapids MI'],
['KAPX', 44.91, -84.72, 'Gaylord MI'],
['KMQT', 46.53, -87.55, 'Marquette MI'],
['KARX', 43.82, -91.19, 'La Crosse WI'],
['KMKX', 42.97, -88.55, 'Milwaukee WI'],
['KGRB', 44.50, -88.11, 'Green Bay WI'],
['KDLH', 46.84, -92.21, 'Duluth MN'],
['KMPX', 44.85, -93.57, 'Minneapolis MN'],
['KABR', 45.46, -98.41, 'Aberdeen SD'],
['KUDX', 44.12, -102.83, 'Rapid City SD'],
['KFSD', 43.59, -96.73, 'Sioux Falls SD'],
['KOAX', 41.32, -96.37, 'Omaha NE'],
['KLNX', 41.96, -100.58, 'North Platte NE'],
['KUEX', 40.32, -98.44, 'Grand Island NE'],
['KTWX', 38.99, -96.23, 'Topeka KS'],
['KICT', 37.65, -97.44, 'Wichita KS'],
['KDDC', 37.76, -99.97, 'Dodge City KS'],
['KGLD', 39.37, -101.70, 'Goodland KS'],
['KTLX', 35.33, -97.28, 'Oklahoma City OK'],
['KINX', 36.18, -95.56, 'Tulsa OK'],
['KVNX', 36.74, -98.13, 'Vance AFB OK'],
['KFDR', 34.36, -98.98, 'Frederick OK'],
['KPUX', 38.46, -104.18, 'Pueblo CO'],
['KGJX', 39.06, -108.21, 'Grand Junction CO'],
['KFTG', 39.79, -104.55, 'Denver CO'],
['KABX', 35.15, -106.82, 'Albuquerque NM'],
['KHDX', 33.08, -106.12, 'Holloman AFB NM'],
['KFSX', 34.57, -111.20, 'Flagstaff AZ'],
['KEMX', 31.89, -110.63, 'Tucson AZ'],
['KIWA', 33.29, -111.67, 'Phoenix AZ'],
['KYUX', 32.50, -114.66, 'Yuma AZ'],
['KESX', 35.70, -114.89, 'Las Vegas NV'],
['KLRX', 40.74, -116.80, 'Elko NV'],
['KRGX', 39.75, -119.46, 'Reno NV'],
['KICX', 37.59, -112.86, 'Cedar City UT'],
['KMTX', 41.26, -112.45, 'Salt Lake City UT'],
['KSFX', 43.11, -112.69, 'Pocatello ID'],
['KCBX', 43.49, -116.24, 'Boise ID'],
['KOTX', 47.68, -117.63, 'Spokane WA'],
['KATX', 48.19, -122.50, 'Seattle WA'],
['KRTX', 45.71, -122.97, 'Portland OR'],
['KPDT', 45.69, -118.85, 'Pendleton OR'],
['KMAX', 42.08, -122.72, 'Medford OR'],
['KBHX', 40.50, -124.29, 'Eureka CA'],
['KDAX', 38.50, -121.68, 'Sacramento CA'],
['KMUX', 37.16, -121.90, 'San Francisco CA'],
['KHNX', 36.31, -119.63, 'San Joaquin Valley CA'],
['KVBX', 34.84, -120.40, 'Vandenberg AFB CA'],
['KVTX', 34.41, -119.18, 'Los Angeles CA'],
['KSOX', 33.82, -117.64, 'Santa Ana CA'],
['KNKX', 32.92, -117.04, 'San Diego CA']
```

### 6.2 Station Isolation Mode

#### Activation
- **Trigger**: Click NEXRAD dot on map or select station from list
- **Function**: `setStation(code)`
- **UI Changes**:
  1. Station banner appears at top of map
  2. NEXRAD dot for active station glows green
  3. Other NEXRAD dots dim (cyan)
  4. Radar switches to single-site N0Q product
  5. Timeline pauses (no auto-play in station mode)
  6. Right panel shows active station code

#### Station Banner
- **Position**: Top of map (54px from top on desktop, 92px on mobile)
- **Content**: `"🎯 Single Site View: [STATION] | Exit"`
- **Background**: Dark blue with cyan border
- **Z-Index**: 660
- **Exit Button**: Click to return to CONUS composite

#### Single-Site Radar URL
```javascript
`https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::${stationCode}-N0Q-0/{z}/{x}/{y}.png`
```
- **Product**: N0Q (base reflectivity)
- **Tilt**: 0 (lowest elevation angle)
- **Frames**: Latest + 50-frame replay
- **Zoom Levels**: Optimized for 8-12 (station-level detail)

#### Deactivation
- **Trigger**: Click "Exit" button on station banner or reset button in left panel
- **Function**: `exitStationMode()` or `setStation(null)`
- **UI Changes**:
  1. Station banner hides
  2. All NEXRAD dots return to cyan
  3. Radar switches back to CONUS composite
  4. Timeline resumes auto-play (if enabled)
  5. Right panel shows "CONUS"

#### Auto-Switch on Alert Click
- When user clicks alert in list, app automatically switches to nearest NEXRAD station
- **Logic**:
  1. Find alert centroid coordinates
  2. Calculate distance to all 86 stations
  3. Select closest station
  4. Enter station isolation mode
  5. Fly to alert + zoom to 9

---

## 7. PANEL SECTIONS & LAYOUT

### 7.1 Header Bar (42px height)

**Components** (left to right):
1. **Logo** - "StormView" with pulsing dot
2. **LIVE Chip** - Blinking green border, "LIVE" text
3. **Update Info** - "Radar + NWS layers | Updated HH:MMZ" (hidden on mobile)
4. **Spinner** - Shown during data fetches
5. **Zoom Badge** - "Zoom N" (current zoom level)
6. **UTC Clock** - Real-time UTC time (HH:MMZ format, updates every 1s)

**Styling**:
- Background: `rgba(8,12,20,.92)` with `backdrop-filter: blur(10px)`
- Border-bottom: Cyan-tinted border
- Flex layout with gap spacing

### 7.2 Left Panel (260px width, desktop)

**Section 1: Radar / Product** (always open)
- Reflectivity (dBZ) button - Default ON
- Satellite button - Disabled
- Velocity button - Disabled (no live source)

**Section 2: Radar Station** (collapsible, default open)
- Active station display with indicator dot
- NEXRAD toggle (visibility of station dots)
- "Reset to CONUS" button (exits isolation mode)
- Help text: "Replay pauses in single-site mode"

**Section 3: Map Overlays** (collapsible, default open)
- County Borders toggle (default OFF)
- State Borders toggle (default OFF)
- NWS CWA Borders toggle (default OFF)

**Section 4: SPC Outlooks** (collapsible, default collapsed)
- Day 1 Convective toggle (yellow icon)
- Day 2 Convective toggle (orange icon)
- Day 3 Convective toggle (red icon)
- Help text: "CORS may limit SPC data"

**Section 5: Warnings & Watches** (collapsible, default collapsed)
- 15 warning type toggles (all ON by default)
- Color-coded dots matching alert colors
- Organized by priority: TOR, SVR, TWA, SWA, MCD, FF, FLD, WS, SPS, SMW, HEAT, FIRE, WIND, MAR, GEN

**Section 6: Display** (collapsible, default open)
- "Zoom High-Detail Imagery" toggle (disabled in safe mode)
- Radar Opacity slider (20-100%, default 85%)
- Warning Opacity slider (10-100%, default 80%)
- Label Density control (Off/Medium/High/All, default Medium)

**Section 7: Loop Playback** (always open)
- Play/Pause toggle button
- Previous frame button
- Next frame button
- Frame count selector (5/7/14/30/50, default 50)
- Speed selector (1x-8x, default 3x)
- Current frame counter (e.g., "14 / 50")

**Section 8: Color Scale** (always open)
- Canvas legend with gradient
- Value tickmarks (min/mid/max)
- Unit label (dBZ, °C, or knots)
- Product name (Reflectivity, Satellite, or Velocity)

**Section 9: Active Alerts** (collapsible, default open)
- Title shows alert count (e.g., "Active Alerts (3)")
- List of up to 18 alerts (sorted by priority)
- Each alert: color dot + event name + area + expiration
- "+N more" if alerts exceed 18
- "No active alerts" fallback message
- Click to zoom + switch station

**Collapsible Behavior**:
- Click section title to expand/collapse
- Arrow icon changes (▾ open, ▸ closed)
- State persists during session (no localStorage)

### 7.3 Right Panel (280px width, desktop)

**Section 1: Location / Forecast** (always visible)
- **Location Display**: Current lat/lon (2 decimal places)
- **Forecast Mode Indicator**: "Click on map for forecast"
- **NWS Forecast Cards** (when loaded):
  - 6 forecast periods (today, tonight, tomorrow, etc.)
  - Each card shows:
    - Period name (e.g., "Tonight")
    - Temperature (e.g., "Low: 45°F")
    - Wind (e.g., "S 5 to 10 mph")
    - Conditions (e.g., "Partly cloudy")
  - Day periods: Light blue background
  - Night periods: Dark blue background
  - Scrollable if cards exceed panel height

**Section 2: Refresh Control** (always visible)
- **AUTO Toggle Button** (default ON)
  - Enables/disables 2-minute auto-refresh
  - Cyan background when active
- **Manual Refresh Button** ("↺ Now")
  - Forces immediate radar reload
  - Shows spinner during fetch
- **Info Text**: "Auto-refresh: 2 min (5/7/14/30/50 frame support)"

**Section 3: Quick Analysis** (always visible)
- **2×2 Grid Display**:
  - **Radar Site**: "CONUS" or station code (e.g., "KLBB")
    - Color: Cyan if station active, gray if CONUS
  - **Product**: "N0Q REF" / "SAT IR" / "VEL"
    - Color: Cyan if active, gray if disabled
  - **Outlook**: "Off" or "D1 ✓ D2… D3…"
    - Color: Yellow if active, gray if off
  - **Model**: "Off" or "HRRR+RRFS"
    - Color: Cyan if active, gray if off
- Each cell shows label + value
- Updates in real-time as layers toggle

**Section 4: Data Sources** (always visible)
- **Radar**: "RainViewer + IEM NEXRAD ridge"
- **Warnings**: "api.weather.gov (NWS API)"
- **Outlook**: "SPC GeoJSON Day 1/2/3"
- **Model**: "Iowa State HRRR REFD + RRFS-A"
- Monospace font, gray text
- Educational reference for users

### 7.4 Floating Map Overlays

#### Wxbar (Top-left of map)
- **Components** (flex layout):
  - **MODE Chips**: RADAR / MODEL / SPC (selectable, one at a time)
  - **Radar Info**: Active station + product (e.g., "KLBB | N0Q")
  - **Overlay Info**: Active overlays (e.g., "Counties ✓")
  - **Region**: "CONUS" or "Zoom HD" toggle
- **Styling**: Dark background, blurred backdrop, cyan border, rounded corners
- **Mobile**: Horizontal scroll, no scrollbar visible

#### Modebar (Top of map, center)
- **Tabs**: Home / Radar / Satellite / SPC Day 1
- **Active Tab**: Blue background with white text
- **Inactive Tabs**: Transparent with dark text
- **Dim State**: Satellite tab at 65% opacity (disabled)
- **Mobile**: Relocates to bottom (84px from bottom), horizontal scroll

#### Timeline (Bottom of map, center)
- **Components** (flex layout):
  - Previous button (◀)
  - Play/Pause button (▶/⏸)
  - Next button (▶)
  - Timeline bar with frame ticks
  - Time chip (HH:MMZ or LIVE)
  - Station chip (CONUS or station code)
  - Speed dropdown (1x-8x)
- **Styling**: Dark background, blurred backdrop, cyan border, rounded pill shape
- **Mobile**: Full width (left/right: 8px), horizontal scroll

#### Search Bar (Top of map, center)
- **Components**:
  - Text input (flex: 1)
  - GO button
  - Suggestions dropdown (hidden by default)
- **Width**: 340px (desktop), auto (mobile)
- **Mobile**: Top position 52px, full width minus margins

#### Zoom Controls (Right side of map)
- **Buttons** (vertical stack):
  - + (zoom in)
  - − (zoom out)
  - FIT (reset to CONUS)
- **Size**: 28px × 28px (desktop), 34px × 34px (mobile)
- **Mobile**: Bottom position 126px (above timeline)

#### Minitools (Left side of map, desktop only)
- **Buttons** (vertical stack):
  - R (Radar mode)
  - S (Satellite mode)
  - M (Model overlay toggle)
  - W (Warnings/Outlook toggle)
- **Size**: 42px × 42px
- **Mobile**: Hidden (`display: none !important`)

#### Model Dock (Right side of map, desktop only)
- **Size**: 280px width, auto height
- **Content**:
  - Header: "Model Data"
  - 2×2 grid of model parameters
  - Each cell: Label + value
  - Example: "CAPE: 2500 J/kg"
- **Mobile**: Hidden (`display: none !important`)

#### Status Bar (Bottom of map)
- **Components**:
  - Spinner (shown during fetches)
  - Status message (e.g., "Fetching radar frames...")
- **Behavior**: Fades to 40% opacity after 5 seconds
- **Mobile**: Smaller font (8px)

#### Tornado Banner (Top of map)
- **Trigger**: Active TOR warnings
- **Content**: "⚠ [N] TORNADO WARNING[S] ACTIVE — TAKE SHELTER NOW ⚠"
- **Styling**: Dark red background, red border, blinking animation
- **Auto-hide**: After 20 seconds
- **Mobile**: Full width, top position 92px

#### Station Banner (Top of map)
- **Trigger**: Station isolation mode active
- **Content**: "🎯 Single Site View: [STATION] | Exit"
- **Styling**: Dark blue background, cyan border
- **Exit Button**: Click to return to CONUS
- **Mobile**: Full width, top position 92px

#### Warning Detail Card (Center overlay)
- **Size**: 500px width (desktop), auto (mobile)
- **Position**: Centered via `transform: translateX(-50%)`
- **Components**:
  - Header: Event type (color-coded)
  - Expiration time
  - Affected areas
  - Hazard/Source/Impact sections (parsed)
  - Full description (up to 800 chars)
  - Instructions (highlighted in red box)
  - Close button (✕)
- **Z-Index**: 800
- **Mobile**: Full width minus margins (left/right: 8px)

#### WeatherBell Panel (Right side overlay)
- **Size**: 520px × 340px (desktop), responsive (mobile)
- **Components**:
  - Header: "RRFS-A Model" + open/close buttons
  - Iframe: Embedded WeatherBell map
  - Fallback message if iframe blocked
- **Z-Index**: 750
- **Mobile**: Full width (left/right: 8px), height 48vh

### 7.5 Bottom Bar (Below map)

**Components** (left to right):
- **App Name**: "StormView"
- **Separator**: |
- **Layer Info**: "Real-time NEXRAD Radar" or current layer
- **Separator**: |
- **Coordinates**: "Lat: XX.XX | Lon: -XX.XX"
- **Separator**: |
- **Zoom**: "Z: N"

**Styling**:
- Background: Dark surface color
- Border-top: Cyan-tinted border
- Font: 9px monospace
- Color: Muted gray

**Mobile**:
- Flex-wrap: wrap (stacks on small screens)
- Reduced font size (8px)
- Hidden in ultra-safe mode (`display: none !important`)

---

## 8. STATE MANAGEMENT & DATA FLOW

### 8.1 Global State Variables

```javascript
// Core State
let map = null                      // Leaflet map instance
let curLayer = 'ref'               // Current layer: 'ref' | 'sat' | 'vel'
let radOp = 0.85                   // Radar opacity (0-1)
let wrnOp = 0.80                   // Warning opacity (0-1)
let lblMode = 1                    // Label density: 0|1|2|3

// Radar System
let rvFrames = []                  // RainViewer frame array
let radLayers = {}                 // Cached Leaflet tile layers
let fIdx = 0                       // Current frame index (0 to frameCount-1)
let rvHost = ''                    // RainViewer CDN host URL
let frameCount = 50                // Loop frame count (5/7/14/30/50)

// Playback Control
let playing = false                // Animation state
let spd = 3                        // Playback speed (1-8)
let lastTs = 0                     // performance.now() timestamp
let autoOn = true                  // Auto-refresh enabled

// Warning System
let wrnVis = {                     // Visibility per warning type
  TOR: true, SVR: true, TWA: true, SWA: true, MCD: true,
  FF: true, FLD: true, WS: true, SPS: true, SMW: true,
  HEAT: true, FIRE: true, WIND: true, MAR: true, GEN: true
}
let wrnLyrs = {}                   // Cached warning GeoJSON layers
let alerts = []                    // Active alert objects
let alertCenters = {}              // Alert centroid positions

// Map Features
let cityGrp = null                 // City labels layer group
let pinMkr = null                  // Dropped pin marker
let activeStation = null           // Current NEXRAD station code
let isolationMode = false          // Station isolation state
let nexradDotsOn = true            // NEXRAD marker visibility

// Overlays
let overlayVis = {                 // Overlay visibility states
  county: false,
  state: false,
  cwa: false
}
let spcOn = {                      // SPC day toggles
  1: false,
  2: false,
  3: false
}
let hrrrOn = false                 // HRRR model overlay
let rrfsOn = false                 // RRFS model overlay

// UI State
let highDetailOn = true            // High detail toggle (disabled)
let wbOpen = false                 // WeatherBell panel state
```

### 8.2 Data Fetch Patterns

#### Radar Frames (RainViewer API)
```javascript
async function loadRadar() {
  spin(true); msg('Fetching radar frames...')

  const res = await fetch('https://api.rainviewer.com/public/weather-maps.json', {timeout: 12000})
  const data = await res.json()

  rvHost = data.host
  rvFrames = data.radar.past.slice(-frameCount)  // Take last N frames

  fIdx = rvFrames.length - 1  // Start at latest
  rebuildRadar()              // Create tile layers

  spin(false); msg('Radar loaded')
  updateHeader()              // Update timestamp
}
```

#### NWS Warnings (Active Alerts API)
```javascript
async function fetchWarnings() {
  spin(true); msg('Fetching NWS warnings...')

  const res = await fetch('https://api.weather.gov/alerts/active?status=actual&message_type=alert,update', {
    headers: {
      'User-Agent': 'StormView-WX/1.0',
      'Accept': 'application/geo+json'
    },
    timeout: 15000
  })
  const data = await res.json()

  alerts = data.features.map(parseAlert)  // Extract relevant fields
  rebuildWarnings()                        // Create GeoJSON layers
  updateAlertList()                        // Update left panel
  checkTornadoAlerts()                     // Show banner if needed

  spin(false); msg('Warnings loaded')
}
```

#### SPC Outlooks (Day 1/2/3)
```javascript
async function fetchSPC(day) {
  const url = `https://www.spc.noaa.gov/products/outlook/day${day}otlk_cat.nolyr.geojson`

  try {
    const res = await fetch(url, {timeout: 12000})
    const data = await res.json()

    spcLayers[day] = L.geoJSON(data, {
      style: (feature) => getSPCStyle(feature, day),
      onEachFeature: (feature, layer) => {
        layer.on('click', onSpcClick)
        layer.bindTooltip(getSPCTooltip(feature))
      }
    }).addTo(map)

  } catch (err) {
    console.warn(`SPC Day ${day} fetch failed (CORS?)`)
    msg(`SPC Day ${day} unavailable`)
  }
}
```

#### NWS Point Forecast
```javascript
async function fetchForecast(lat, lon) {
  spin(true); msg('Fetching forecast...')

  // Step 1: Get forecast URL from points API
  const pointRes = await fetch(`https://api.weather.gov/points/${lat},${lon}`, {timeout: 8000})
  const pointData = await pointRes.json()
  const forecastUrl = pointData.properties.forecast

  // Step 2: Fetch forecast periods
  const fcstRes = await fetch(forecastUrl, {timeout: 8000})
  const fcstData = await fcstRes.json()
  const periods = fcstData.properties.periods.slice(0, 6)  // First 6 periods

  renderForecast(periods)  // Populate right panel

  spin(false); msg('Forecast loaded')
}
```

### 8.3 State Update Flow

#### Layer Switch Example
```javascript
function setLayer(id) {
  // 1. Update state
  curLayer = id

  // 2. Update UI toggles
  document.querySelectorAll('.lbtn').forEach(btn => btn.classList.remove('on'))
  document.getElementById(`btn-${id}`).classList.add('on')

  // 3. Rebuild map layers
  rebuildRadar()
  updateColorScale()

  // 4. Update info displays
  updateQuickAnalysis()
  updateWxbar()
}
```

#### Alert Toggle Example
```javascript
function toggleWarn(type) {
  // 1. Update state
  wrnVis[type] = !wrnVis[type]

  // 2. Update UI toggle
  document.getElementById(`wtgl-${type}`).classList.toggle('on')

  // 3. Update map layer visibility
  if (wrnLyrs[type]) {
    if (wrnVis[type]) {
      map.addLayer(wrnLyrs[type])
    } else {
      map.removeLayer(wrnLyrs[type])
    }
  }
}
```

#### Station Isolation Example
```javascript
function setStation(code) {
  // 1. Update state
  activeStation = code
  isolationMode = (code !== null)

  // 2. Update UI
  if (isolationMode) {
    document.getElementById('station-banner').classList.add('on')
    document.getElementById('station-banner').textContent = `🎯 Single Site View: ${code}`
    pausePlayback()  // Stop animation
  } else {
    document.getElementById('station-banner').classList.remove('on')
    resumePlayback()  // Resume animation
  }

  // 3. Rebuild radar layers
  rebuildRadar()  // Switches between CONUS and single-site tiles

  // 4. Update NEXRAD dots
  rebuildNexradDots()  // Highlight active station

  // 5. Update info displays
  updateQuickAnalysis()
  updateWxbar()
}
```

### 8.4 Event Handlers

```javascript
// Map Events
map.on('click', onMapClick)         // Drop pin + fetch forecast
map.on('mousemove', onMoveMap)      // Update lat/lon display
map.on('zoomend', onZoom)           // Update zoom display + labels

// Timeline Events
tlBar.addEventListener('click', seekFrame)
playBtn.addEventListener('click', togglePlay)
prevBtn.addEventListener('click', () => advanceFrame(-1))
nextBtn.addEventListener('click', () => advanceFrame(1))

// Search Events
searchInput.addEventListener('input', onSrch)
searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') doSrch()
  if (e.key === 'Escape') hideSuggestions()
})
goBtn.addEventListener('click', doSrch)

// Collapsible Sections
document.querySelectorAll('.sec.collapsible > .st').forEach(header => {
  header.addEventListener('click', () => {
    header.parentElement.classList.toggle('collapsed')
  })
})
```

### 8.5 Auto-Update System

```javascript
// Auto-refresh radar every 2 minutes
function startRadarAutoRefresh() {
  if (!autoOn) return

  setInterval(async () => {
    if (!autoOn) return

    const oldLatest = rvFrames[rvFrames.length - 1]?.time
    await loadRadar()  // Fetch latest frames
    const newLatest = rvFrames[rvFrames.length - 1]?.time

    if (newLatest > oldLatest) {
      console.log('New radar frame available, reloaded')
      fIdx = rvFrames.length - 1  // Jump to latest
      showCurrentFrame()
    }
  }, 120000)  // 2 minutes
}

// Auto-refresh warnings every 60 seconds
function startWarningAutoRefresh() {
  setInterval(async () => {
    await fetchWarnings()
    await fetchSPCWatches()
    await fetchSPCMCDs()
  }, 60000)  // 1 minute
}
```

---

## 9. MOBILE RESPONSIVENESS

### 9.1 Breakpoints

- **≤ 760px**: Mobile layout (panel stacking, full-width controls)
- **≤ 420px**: Ultra-mobile (tighter spacing, smaller fonts)

### 9.2 Layout Transformations

#### Desktop Layout (> 760px)
```
┌─────────────────────────────────────┐
│           Header (42px)             │
├────────┬────────────────────┬───────┤
│        │                    │       │
│  Left  │        Map         │ Right │
│ Panel  │                    │ Panel │
│ 260px  │                    │ 280px │
│        │                    │       │
└────────┴────────────────────┴───────┘
```

#### Mobile Layout (≤ 760px)
```
┌─────────────────────────────────────┐
│           Header (42px)             │
├─────────────────────────────────────┤
│                                     │
│            Map (56vh)               │
│                                     │
├─────────────────────────────────────┤
│         Left Panel (100%)           │
│         (scrollable)                │
├─────────────────────────────────────┤
│        Right Panel (100%)           │
│         (scrollable)                │
└─────────────────────────────────────┘
```

### 9.3 Mobile CSS Overrides

```css
@media (max-width: 760px) {
  /* Layout */
  #wrap {
    flex-direction: column;
    overflow: visible;
  }

  #map-wrap {
    height: 56vh;
    min-height: 380px;
    order: 1;
  }

  #left, #right {
    width: 100%;
    order: 2, 3;
    border-top: 1px solid var(--brd);
    border-left: none;
    border-right: none;
  }

  /* Hide panels in ultra-safe mode */
  #left, #right, #bot {
    display: none !important;  /* Ultra-safe: map only */
  }

  /* Floating controls */
  #wxbar {
    top: 8px;
    left: 8px;
    right: 8px;
    overflow-x: auto;
    scrollbar-width: none;
  }

  #sbar {
    top: 52px;
    left: 8px;
    right: 8px;
    width: auto;
  }

  #modebar {
    bottom: 84px;
    left: 8px;
    right: 8px;
    overflow-x: auto;
  }

  #timeline {
    bottom: 34px;
    left: 8px;
    right: 8px;
    overflow-x: auto;
  }

  #zc {
    bottom: 126px;
    right: 8px;
  }

  .zb {
    width: 34px;
    height: 34px;
  }

  /* Hide desktop-only features */
  #minitools, #modeldock {
    display: none !important;
  }
}
```

### 9.4 Touch-Friendly Features

- **Larger tap targets**: Buttons increase from 28px to 34px
- **Increased padding**: Input fields gain 2-4px extra padding
- **Horizontal scrolling**: Wxbar, modebar, timeline scroll without scrollbars
- **No hover-only**: All interactions work on touch (tooltips remain sticky)
- **Swipe-friendly**: Map panning works with touch gestures
- **Pinch zoom**: Map zoom via pinch (Leaflet native)

### 9.5 Ultra-Safe Mode Behavior

**Purpose**: Ensures reliable Leaflet map sizing on all mobile devices

**Key Changes**:
- Side panels hidden completely (`display: none !important`)
- Bottom bar hidden
- Map takes full available space (flex: 1)
- Original flex layout preserved (prevents Leaflet sizing bugs)
- Floating controls repositioned for mobile (wxbar, search, timeline, zoom)

---

## 10. ANIMATIONS & VISUAL EFFECTS

### 10.1 CSS Keyframe Animations

#### Pulse (Header Dot)
```css
@keyframes pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.3; transform: scale(0.6); }
}
/* Applied to: .pdot (logo dot) */
/* Duration: 1.4s, ease-in-out, infinite */
```

#### Blink (Status Chips & Tornado Text)
```css
@keyframes blink {
  50% { opacity: 0.3; }
}
/* Applied to: .chip (LIVE), tornado count */
/* Duration: 1.8s, steps(1), infinite */
```

#### Spin (Loading Indicators)
```css
@keyframes spin {
  to { transform: rotate(360deg); }
}
/* Applied to: .sp (spinners) */
/* Duration: 0.7s, linear, infinite */
```

#### Tornado Banner Pulse
```css
@keyframes tob {
  50% { border-color: #800; color: #c03030; }
}
/* Applied to: #tor-ban */
/* Duration: 1s, steps(1), infinite */
```

#### SPC Highlight Pulse
```css
@keyframes spc-glow {
  from { stroke-opacity: 1; stroke-width: 4px; }
  to { stroke-opacity: 0.3; stroke-width: 8px; }
}
/* Applied to: .spc-highlight-pulse (SVG stroke) */
/* Duration: 0.6s, ease-in-out, infinite, alternate */
```

### 10.2 JavaScript Animations

#### Map Fly-To
```javascript
map.flyTo([lat, lon], zoom, {
  duration: 1.2,       // 1.2 seconds
  easeLinearity: 0.25  // Smooth curve
})
```

#### Timeline Playback Loop
```javascript
function animLoop(ts) {
  if (!playing) return

  const elapsed = ts - lastTs
  const delay = 800 / spd  // Frame delay based on speed

  if (elapsed >= delay) {
    advanceFrame(1)  // Next frame
    lastTs = ts
  }

  requestAnimationFrame(animLoop)
}
```

#### Timeline Head Movement
```css
.tlbar::before {
  left: 0%;
  transition: left 0.3s;  /* Smooth position change */
}
```
```javascript
tlHead.style.left = (fIdx / (frameCount - 1) * 100) + '%'
```

### 10.3 Visual Effects

#### Alert Polygon Rendering
- **Fill**: Semi-transparent color (7-22% base opacity × warning slider)
- **Stroke**: Colored border (2px width, 85% opacity)
- **Dash Pattern**: Varies by type (e.g., `dashArray: '6,4'`)
- **Z-Index Stacking**: 250-500 (TOR highest at 500)

#### NEXRAD Dot Glow
```css
.nexrad-dot {
  box-shadow: 0 0 8px rgba(0,212,255,0.6);  /* Inactive: cyan */
}
.nexrad-dot.active {
  box-shadow: 0 0 14px rgba(0,255,136,0.8); /* Active: green */
}
```

#### City Label Glow
```css
.city-label {
  text-shadow: 0 0 4px rgba(0,212,255,0.5);
  border: 1px solid rgba(0,212,255,0.2);
}
```

#### Gradient Chip Buttons
```css
.wxchip.on {
  background: linear-gradient(180deg, rgba(36,146,255,.35), rgba(10,78,134,.52));
  border-color: #74c7ff;
  box-shadow: inset 0 0 0 1px rgba(145,214,255,.18), 0 0 14px rgba(57,164,255,.12);
}
```

#### Backdrop Blur (Floating Panels)
```css
.floating-panel {
  backdrop-filter: blur(9px);
  background: rgba(8,12,20,.88);
}
```

---

## 11. API INTEGRATION DETAILS

### 11.1 RainViewer API

**Endpoint**: `https://api.rainviewer.com/public/weather-maps.json`

**Response Structure**:
```json
{
  "version": "1.4",
  "generated": 1234567890,
  "host": "https://tilecache.rainviewer.com",
  "radar": {
    "past": [
      {"time": 1234567890, "path": "/v2/radar/1234567890/256"},
      ...
    ],
    "nowcast": []
  },
  "satellite": {...}
}
```

**Tile URL Construction**:
```javascript
const tileUrl = `${host}${framePath}/256/{z}/{x}/{y}/8/1_1.png`
// Example: https://tilecache.rainviewer.com/v2/radar/1234567890/256/{z}/{x}/{y}/8/1_1.png
// Path params: 8 = color scheme, 1_1 = smooth/snow options
```

**Usage**:
- Fetch frame list every 2 minutes (auto-refresh)
- Take last N frames (where N = frameCount)
- Create Leaflet tile layers for each frame
- Display one frame at a time (controlled by timeline)

### 11.2 NWS API

#### Active Alerts Endpoint
**URL**: `https://api.weather.gov/alerts/active`

**Query Parameters**:
- `status=actual` (exclude tests/exercises)
- `message_type=alert,update` (exclude cancellations)

**Headers**:
```javascript
{
  'User-Agent': 'StormView-WX/1.0',
  'Accept': 'application/geo+json'
}
```

**Response**: GeoJSON FeatureCollection

**Feature Properties** (relevant fields):
```json
{
  "event": "Tornado Warning",
  "severity": "Extreme",
  "urgency": "Immediate",
  "certainty": "Observed",
  "headline": "Tornado Warning issued...",
  "description": "Full alert text...",
  "instruction": "Take shelter immediately...",
  "areaDesc": "Smith County; Jones County",
  "expires": "2024-05-01T23:45:00-05:00",
  "senderName": "NWS Norman OK",
  "affectedZones": ["TXZ001", "TXZ002"]
}
```

**Parsing Logic**:
```javascript
function parseAlert(feature) {
  const props = feature.properties
  const type = getAlertType(props.event)  // Map to internal type codes

  return {
    type: type,
    event: props.event,
    severity: props.severity,
    areas: props.areaDesc,
    expires: new Date(props.expires),
    headline: props.headline,
    description: props.description,
    instruction: props.instruction,
    geom: feature.geometry
  }
}
```

#### Point Forecast Endpoint
**URL**: `https://api.weather.gov/points/{lat},{lon}`

**Response**:
```json
{
  "properties": {
    "forecast": "https://api.weather.gov/gridpoints/OUN/45,67/forecast",
    "forecastOffice": "https://api.weather.gov/offices/OUN",
    "forecastZone": "https://api.weather.gov/zones/forecast/OKZ025"
  }
}
```

**Forecast URL Response**:
```json
{
  "properties": {
    "periods": [
      {
        "number": 1,
        "name": "Tonight",
        "startTime": "2024-05-01T20:00:00-05:00",
        "temperature": 45,
        "temperatureUnit": "F",
        "windSpeed": "5 to 10 mph",
        "windDirection": "S",
        "shortForecast": "Partly Cloudy",
        "detailedForecast": "Partly cloudy with..."
      },
      ...
    ]
  }
}
```

### 11.3 SPC API

#### Convective Outlooks
**URLs**:
- Day 1: `https://www.spc.noaa.gov/products/outlook/day1otlk_cat.nolyr.geojson`
- Day 2: `https://www.spc.noaa.gov/products/outlook/day2otlk_cat.nolyr.geojson`
- Day 3: `https://www.spc.noaa.gov/products/outlook/day3otlk_cat.nolyr.geojson`

**Response**: GeoJSON FeatureCollection

**Feature Properties**:
```json
{
  "DN": 2,           // Risk category (0=TSTM, 2=MRGL, 5=SLGT, 10=ENH, 15=MDT, 20=HIGH)
  "VALID": "202405012000",
  "EXPIRE": "202405020600",
  "ISSUE": "202405011630",
  "LABEL": "SLGT",
  "LABEL2": "0.15"   // Probability for Day 2/3
}
```

**Risk Category Mapping**:
```javascript
const riskMap = {
  0: { name: 'TSTM', color: '#a3cc51', opacity: 0.10 },
  2: { name: 'MRGL', color: '#66a366', opacity: 0.15 },
  5: { name: 'SLGT', color: '#ffff00', opacity: 0.18 },
  10: { name: 'ENH', color: '#ff9900', opacity: 0.22 },
  15: { name: 'MDT', color: '#ff0000', opacity: 0.25 },
  20: { name: 'HIGH', color: '#ff00ff', opacity: 0.30 }
}
```

#### Active Watches
**URL**: `https://www.spc.noaa.gov/products/watch/ActiveWW.geojson`

**Feature Properties**:
```json
{
  "ww_num": 123,
  "ww_type": "TORNADO",   // or "SEVERE THUNDERSTORM"
  "issue_time": "202405011830",
  "expiration": "202405020200",
  "states": "OK,TX"
}
```

#### Mesoscale Discussions
**URL**: `https://www.spc.noaa.gov/products/md/ActiveMD.geojson`

**Feature Properties**:
```json
{
  "md_num": 456,
  "issue_time": "202405011645",
  "concerning": "Watch likely",
  "areas_affected": "Central Oklahoma"
}
```

### 11.4 Iowa State Mesonet (IEM)

#### NEXRAD Ridge Tiles
**URL Pattern**:
```
https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::{station}-{product}-{tilt}/{z}/{x}/{y}.png
```

**Parameters**:
- `{station}`: NEXRAD site code (e.g., KLBB, KAMA, KFWS)
- `{product}`: Radar product code (N0Q, N0S, N0V, etc.)
- `{tilt}`: Elevation angle (0 = lowest)
- `{z}/{x}/{y}`: Standard TMS tile coordinates

**Example**:
```
https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/ridge::KLBB-N0Q-0/8/51/107.png
```

**Products Available**:
- N0Q: Base reflectivity (high-res, 0.5° tilt)
- N0S: Storm relative velocity
- N0V: Base velocity
- (Many others - see IEM docs)

**Cache Behavior**:
- Latest frame: Always current (30-60 second lag)
- Historical frames: 50-frame replay available
- Cache duration: ~2-3 hours

#### HRRR REFD Tiles
**URL Pattern**:
```
https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/hrrr::REFD/{z}/{x}/{y}.png
```

**Product**: Composite reflectivity forecast from HRRR model

#### RRFS-A REFC Tiles
**URL Pattern**:
```
https://mesonet.agron.iastate.edu/cache/tile.py/1.0.0/rrfs_refc/{z}/{x}/{y}.png
```

**Product**: Composite reflectivity forecast from RRFS-A model

### 11.5 NWS WMS (Reference Maps)

**Base URL**: `https://mapservices.weather.noaa.gov/static/services/nws_reference_maps/nws_reference_map/MapServer/WMSServer`

**WMS Parameters**:
- `SERVICE=WMS`
- `VERSION=1.3.0`
- `REQUEST=GetMap`
- `FORMAT=image/png`
- `TRANSPARENT=true`
- `LAYERS=1,2,3` (CWA, counties, states)
- `CRS=EPSG:3857`
- `BBOX={bbox}` (calculated by Leaflet)
- `WIDTH=256`
- `HEIGHT=256`

**Layer IDs**:
- Layer 1: CWA boundaries (NWS forecast office regions)
- Layer 2: County boundaries
- Layer 3: State boundaries

### 11.6 OSM Nominatim (Geocoding)

**URL**: `https://nominatim.openstreetmap.org/search`

**Query Parameters**:
- `q`: Search term (e.g., "Dallas, TX")
- `format=json`
- `limit=1`
- `countrycodes=us` (US-only results)

**Headers**:
```javascript
{
  'Accept-Language': 'en'
}
```

**Response**:
```json
[
  {
    "place_id": 123456,
    "lat": "32.7767",
    "lon": "-96.7970",
    "display_name": "Dallas, Dallas County, Texas, United States",
    "type": "city"
  }
]
```

### 11.7 WeatherBell (Embedded Iframe)

**URL**: `https://maps.weatherbell.com/view/model/rrfs_a?d=scentus&p=refc`

**Parameters**:
- `model=rrfs_a` (RRFS-A model)
- `d=scentus` (Southern-Central US domain)
- `p=refc` (Composite reflectivity product)

**Note**: May be blocked by iframe restrictions (X-Frame-Options)

**Fallback**: Open in new tab link provided

---

## 12. ERROR HANDLING & EDGE CASES

### 12.1 Network Errors

#### API Timeout Handling
```javascript
async function fetchWithTimeout(url, options = {}) {
  const timeout = options.timeout || 10000

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeout)

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    })
    clearTimeout(id)
    return res
  } catch (err) {
    clearTimeout(id)
    if (err.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeout}ms`)
    }
    throw err
  }
}
```

#### Retry Logic (for Critical Data)
```javascript
async function fetchWarningsWithRetry(retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetchWarnings()
    } catch (err) {
      console.warn(`Warning fetch attempt ${i+1} failed:`, err)
      if (i === retries - 1) throw err
      await sleep(2000 * (i + 1))  // Exponential backoff
    }
  }
}
```

### 12.2 Data Validation

#### Alert Parsing Safety
```javascript
function parseAlert(feature) {
  try {
    const props = feature.properties || {}
    const geom = feature.geometry

    if (!geom || !geom.coordinates) {
      console.warn('Alert missing geometry, skipping')
      return null
    }

    return {
      type: getAlertType(props.event) || 'GEN',
      event: props.event || 'Unknown',
      areas: props.areaDesc || 'Unknown area',
      expires: props.expires ? new Date(props.expires) : null,
      geom: geom
    }
  } catch (err) {
    console.error('Alert parse error:', err)
    return null
  }
}
```

#### Coordinate Validation
```javascript
function validateCoords(lat, lon) {
  const latNum = parseFloat(lat)
  const lonNum = parseFloat(lon)

  if (isNaN(latNum) || isNaN(lonNum)) return null
  if (latNum < 24 || latNum > 50) return null  // CONUS bounds
  if (lonNum < -125 || lonNum > -65) return null

  return [latNum, lonNum]
}
```

### 12.3 UI State Recovery

#### Map Sizing Issues (Mobile)
```javascript
// Force map invalidation on resize
window.addEventListener('resize', debounce(() => {
  if (map) map.invalidateSize()
}, 250))

// Detect orientation change
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    if (map) map.invalidateSize()
  }, 300)
})
```

#### Missing Frame Handling
```javascript
function showCurrentFrame() {
  if (fIdx < 0 || fIdx >= rvFrames.length) {
    console.warn('Invalid frame index:', fIdx)
    fIdx = Math.max(0, Math.min(fIdx, rvFrames.length - 1))
  }

  const frame = rvFrames[fIdx]
  if (!frame) {
    console.error('Frame not found at index', fIdx)
    return
  }

  // Show frame...
}
```

### 12.4 Graceful Degradation

#### SPC Outlook CORS Fallback
```javascript
async function fetchSPC(day) {
  try {
    const data = await fetchSPCOutlook(day)
    renderSPCLayer(day, data)
  } catch (err) {
    console.warn(`SPC Day ${day} unavailable (likely CORS)`)
    msg(`SPC Day ${day} unavailable - try reloading`)
    // Disable toggle button
    document.getElementById(`spc-d${day}`).disabled = true
  }
}
```

#### Satellite/Velocity Disabled State
```javascript
// Buttons present but non-functional
document.getElementById('btn-sat').disabled = true
document.getElementById('btn-sat').title = 'Disabled in radar-only mode'

// Click handler no-op
function setLayer(id) {
  if (id === 'sat' || id === 'vel') {
    msg('Layer unavailable in this build')
    return
  }
  // Normal logic...
}
```

---

## 13. PERFORMANCE OPTIMIZATIONS

### 13.1 Layer Caching

```javascript
// Cache tile layers to avoid re-creating
let radLayers = {}

function getRadarLayer(frameIdx) {
  const key = `frame-${frameIdx}`

  if (!radLayers[key]) {
    const frame = rvFrames[frameIdx]
    radLayers[key] = L.tileLayer(buildTileUrl(frame), {
      opacity: radOp,
      maxZoom: 12,
      className: 'radar-sharp'
    })
  }

  return radLayers[key]
}
```

### 13.2 Debouncing & Throttling

```javascript
// Debounce search input
const onSrch = debounce(() => {
  const q = searchInput.value.trim()
  if (q.length < 2) {
    hideSuggestions()
    return
  }
  showSuggestions(q)
}, 300)

// Throttle mouse move updates
const onMoveMap = throttle((e) => {
  updateLatLonDisplay(e.latlng)
}, 100)
```

### 13.3 Request Cancellation

```javascript
let currentFetchController = null

async function fetchWarnings() {
  // Cancel previous request if still pending
  if (currentFetchController) {
    currentFetchController.abort()
  }

  currentFetchController = new AbortController()

  try {
    const res = await fetch(url, {
      signal: currentFetchController.signal
    })
    // Process...
  } catch (err) {
    if (err.name === 'AbortError') {
      console.log('Request cancelled')
      return
    }
    throw err
  }
}
```

### 13.4 Frame Preloading

```javascript
// Preload next 3 frames during playback
function preloadFrames() {
  const preloadCount = 3
  for (let i = 1; i <= preloadCount; i++) {
    const nextIdx = (fIdx + i) % rvFrames.length
    getRadarLayer(nextIdx)  // Triggers creation if not cached
  }
}
```

### 13.5 Label Priority System

```javascript
// Only show relevant labels based on zoom
function rebuildCities() {
  cityGrp.clearLayers()

  const zoom = map.getZoom()
  let priority = 0

  if (zoom >= 10) priority = 4      // Show all
  else if (zoom >= 8) priority = 3  // Show high
  else if (zoom >= 6) priority = 2  // Show medium
  else priority = 1                  // Show major only

  if (lblMode === 0) priority = 0   // Off
  if (lblMode === 3) priority = 4   // All override

  cities.forEach(c => {
    if (c.priority <= priority) {
      addCityLabel(c)
    }
  })
}
```

---

## 14. ACCESSIBILITY CONSIDERATIONS

### 14.1 Keyboard Navigation

**Implemented**:
- Enter key: Submit search
- Escape key: Close search suggestions, close warning card
- Arrow keys: Navigate suggestions (not implemented in current version)

**Recommended Additions**:
- Tab navigation through controls
- Space bar: Toggle play/pause
- Left/Right arrows: Previous/next frame
- +/- keys: Zoom in/out

### 14.2 Screen Reader Support

**Recommended Additions**:
- ARIA labels on icon-only buttons
- ARIA live regions for status messages
- ARIA expanded/collapsed states for collapsible sections
- Alt text for map markers (via title attributes)

### 14.3 Color Contrast

**Current State**:
- Text on dark backgrounds meets WCAG AA standards
- Warning colors use high-contrast borders
- Focus states use cyan accent color (sufficient contrast)

**Potential Issues**:
- Some muted text may not meet AAA standards (acceptable for AA)
- Alert colors rely on both color and opacity (good redundancy)

---

## 15. FUTURE ENHANCEMENT OPPORTUNITIES

### 15.1 Additional Data Layers

- Mesoscale composite reflectivity (N0Q → N1Q → N2Q → N3Q)
- Dual-pol products (correlation coefficient, differential reflectivity)
- SPC Day 4-8 outlooks
- Winter weather products (accumulated snow, freezing rain)
- Lightning strike data (ENTLN, GLM)
- Surface observations (METAR/ASOS)
- Upper-air soundings (skew-T diagrams)

### 15.2 Enhanced Interactivity

- Distance/bearing measurement tool
- Area selection for custom alerts
- Storm cell tracking with vectors
- Historical event replay (case studies)
- User-defined bookmarks/favorites
- Custom alert triggers (e.g., notify when TOR within 50mi)

### 15.3 Social Features

- Share current map view (URL params for lat/lon/zoom/layers)
- Screenshot/export to image
- Tweet embed support
- WebSocket live updates (no polling)

### 15.4 Advanced Analysis

- VIL (Vertically Integrated Liquid) calculation
- Rotation detection (gate-to-gate shear)
- Hodograph generation
- Storm motion vectors
- Supercell composite parameter (SCP)
- Significant tornado parameter (STP)

---

## 16. TECHNOLOGY STACK (Original Implementation)

### 16.1 Core Libraries

- **Leaflet 1.9.4**: Interactive map library
- **CartoDB Dark Tiles**: Base map layer
- **Native JavaScript**: No framework (vanilla JS)
- **CSS3**: Animations, flexbox, grid, backdrop-filter

### 16.2 Browser Requirements

- **Modern browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **ES6 support**: Required (async/await, arrow functions, template literals)
- **Fetch API**: Required (no XHR fallback)
- **Flexbox/Grid**: Required for layout

### 16.3 Recommended React Stack (for Rebuild)

#### Core
- **React 18+**: UI framework
- **TypeScript**: Type safety
- **Vite**: Build tool (fast HMR)

#### State Management
- **Zustand**: Lightweight global state (already in your setup)
- **React Query / TanStack Query**: API data fetching & caching

#### Map Library
- **React-Leaflet 5.0**: React wrapper for Leaflet (already in your setup)
- **Leaflet 1.9.4**: Core map library

#### Styling
- **Tailwind CSS 4.x**: Utility-first CSS (already in your setup)
- **CSS Modules**: Scoped styles for complex components (optional)

#### Utilities
- **date-fns**: Date formatting & parsing
- **Lodash**: Debounce, throttle, utility functions

#### Testing (Optional)
- **Vitest**: Unit testing
- **React Testing Library**: Component testing
- **Playwright**: E2E testing

---

## 17. REACT COMPONENT ARCHITECTURE (Recommended)

### 17.1 Component Hierarchy

```
<App>
├── <Header>
│   ├── <Logo>
│   ├── <LiveChip>
│   ├── <UpdateInfo>
│   └── <UtcClock>
├── <MainLayout>
│   ├── <LeftPanel>
│   │   ├── <RadarProductSection>
│   │   ├── <RadarStationSection>
│   │   ├── <MapOverlaysSection>
│   │   ├── <SPCOutlooksSection>
│   │   ├── <WarningsSection>
│   │   ├── <DisplaySection>
│   │   ├── <LoopPlaybackSection>
│   │   ├── <ColorScaleSection>
│   │   └── <ActiveAlertsSection>
│   ├── <MapContainer>
│   │   ├── <BaseMap>
│   │   ├── <RadarLayer>
│   │   ├── <WarningLayers>
│   │   ├── <SPCLayers>
│   │   ├── <ModelLayers>
│   │   ├── <CityLabels>
│   │   ├── <NexradDots>
│   │   ├── <PinMarker>
│   │   └── <FloatingControls>
│   │       ├── <Wxbar>
│   │       ├── <Modebar>
│   │       ├── <SearchBar>
│   │       ├── <Timeline>
│   │       ├── <ZoomControls>
│   │       ├── <Minitools>
│   │       └── <StatusBar>
│   └── <RightPanel>
│       ├── <LocationForecast>
│       ├── <RefreshControl>
│       ├── <QuickAnalysis>
│       └── <DataSources>
├── <BottomBar>
├── <TornadoBanner>
├── <StationBanner>
├── <WarningDetailCard>
└── <WeatherBellPanel>
```

### 17.2 State Management Structure

#### Global Store (Zustand)
```typescript
interface StormViewStore {
  // Map State
  mapCenter: [number, number]
  mapZoom: number

  // Layer State
  currentLayer: 'ref' | 'sat' | 'vel'
  radarOpacity: number
  warningOpacity: number
  labelMode: 0 | 1 | 2 | 3

  // Radar State
  frames: RadarFrame[]
  currentFrameIndex: number
  frameCount: 5 | 7 | 14 | 30 | 50
  isPlaying: boolean
  playbackSpeed: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

  // Alert State
  alerts: Alert[]
  alertVisibility: Record<AlertType, boolean>

  // Station State
  activeStation: string | null
  isolationMode: boolean

  // Overlay State
  overlayVisibility: {
    county: boolean
    state: boolean
    cwa: boolean
  }
  spcDays: {
    day1: boolean
    day2: boolean
    day3: boolean
  }
  modelOverlays: {
    hrrr: boolean
    rrfs: boolean
  }

  // UI State
  selectedAlert: string | null
  weatherBellOpen: boolean
  searchQuery: string

  // Actions
  setMapView: (center: [number, number], zoom: number) => void
  setLayer: (layer: 'ref' | 'sat' | 'vel') => void
  togglePlay: () => void
  advanceFrame: (direction: 1 | -1) => void
  setStation: (code: string | null) => void
  toggleAlert: (type: AlertType) => void
  // ... more actions
}
```

#### React Query Hooks
```typescript
// Radar frames
useQuery('radar-frames', fetchRadarFrames, {
  refetchInterval: 120000,  // 2 minutes
  staleTime: 60000
})

// NWS warnings
useQuery('nws-warnings', fetchNWSWarnings, {
  refetchInterval: 60000,  // 1 minute
  staleTime: 30000
})

// SPC outlooks
useQuery(['spc-outlook', day], () => fetchSPCOutlook(day), {
  staleTime: 300000,  // 5 minutes
  retry: 1
})

// NWS forecast
useQuery(['nws-forecast', lat, lon], () => fetchForecast(lat, lon), {
  enabled: !!lat && !!lon,
  staleTime: 600000  // 10 minutes
})
```

### 17.3 Custom Hooks

```typescript
// Map interaction
useMapEvents(map: L.Map) => {
  useEffect(() => {
    const onClick = (e) => { /* ... */ }
    const onMove = (e) => { /* ... */ }

    map.on('click', onClick)
    map.on('mousemove', onMove)

    return () => {
      map.off('click', onClick)
      map.off('mousemove', onMove)
    }
  }, [map])
}

// Auto-refresh radar
useRadarAutoRefresh(enabled: boolean, interval: number)

// Playback loop
useRadarPlayback(playing: boolean, speed: number, onAdvance: () => void)

// Window resize handling
useMapResize(map: L.Map)

// Keyboard shortcuts
useKeyboardShortcuts(handlers: Record<string, () => void>)
```

---

## 18. IMPLEMENTATION CHECKLIST

### Phase 1: Core Setup
- [ ] Initialize React + TypeScript + Vite project
- [ ] Install Leaflet + React-Leaflet
- [ ] Set up Tailwind CSS with custom theme (dark mode)
- [ ] Configure Zustand store
- [ ] Set up React Query

### Phase 2: Map Foundation
- [ ] Implement base map with CartoDB Dark tiles
- [ ] Add map panes (baseLabels, boundaries, outlook)
- [ ] Implement zoom controls
- [ ] Add scale display
- [ ] Handle map click/move events

### Phase 3: Radar System
- [ ] Fetch RainViewer API frames
- [ ] Render radar tile layers
- [ ] Implement frame switching logic
- [ ] Add timeline UI
- [ ] Build playback controls (play/pause, speed, frame count)
- [ ] Implement auto-refresh

### Phase 4: Weather Alerts
- [ ] Fetch NWS warnings API
- [ ] Parse and classify alert types
- [ ] Render alert polygons with correct styling
- [ ] Add alert centroids with labels
- [ ] Implement alert list in left panel
- [ ] Build warning detail card
- [ ] Add tornado banner logic

### Phase 5: NEXRAD Stations
- [ ] Render NEXRAD station dots
- [ ] Implement station click/isolation mode
- [ ] Build single-site radar tile URLs
- [ ] Add station banner
- [ ] Handle nearest station calculation for alerts

### Phase 6: Overlays & Layers
- [ ] Add NWS WMS overlays (county, state, CWA)
- [ ] Fetch SPC outlook GeoJSON
- [ ] Render SPC polygons with correct styling
- [ ] Add HRRR/RRFS model tile layers
- [ ] Implement layer toggle controls

### Phase 7: City Labels & Search
- [ ] Render city labels with priority system
- [ ] Implement label density control
- [ ] Build search bar UI
- [ ] Add city autocomplete
- [ ] Implement coordinate search
- [ ] Add Nominatim geocoding fallback
- [ ] Handle search result flyTo

### Phase 8: NWS Forecast
- [ ] Fetch NWS point API
- [ ] Fetch forecast periods
- [ ] Render forecast cards in right panel
- [ ] Style day/night periods differently

### Phase 9: Panels & Layout
- [ ] Build header with logo, clock, status
- [ ] Implement collapsible sections
- [ ] Add left panel sections (radar, station, overlays, etc.)
- [ ] Add right panel sections (forecast, analysis, sources)
- [ ] Build bottom bar
- [ ] Implement floating controls (wxbar, modebar, timeline)

### Phase 10: Mobile Responsiveness
- [ ] Add mobile breakpoint CSS
- [ ] Implement panel stacking on mobile
- [ ] Reposition floating controls for mobile
- [ ] Add horizontal scroll for wxbar/timeline
- [ ] Increase touch target sizes
- [ ] Test ultra-safe mode (panels hidden)

### Phase 11: Animations & Polish
- [ ] Add CSS keyframe animations (pulse, blink, spin)
- [ ] Implement map flyTo animations
- [ ] Add timeline head smooth transitions
- [ ] Implement SPC highlight pulse
- [ ] Add loading states and spinners
- [ ] Fade status bar after 5 seconds

### Phase 12: Error Handling
- [ ] Add timeout handling for all API calls
- [ ] Implement retry logic for critical data
- [ ] Add data validation for alerts/coordinates
- [ ] Handle CORS failures gracefully
- [ ] Add user-facing error messages

### Phase 13: Testing & Optimization
- [ ] Test on Chrome, Firefox, Safari, Edge
- [ ] Test mobile (iOS, Android)
- [ ] Optimize layer caching
- [ ] Add debouncing/throttling
- [ ] Profile performance with React DevTools
- [ ] Test with slow network (3G throttling)

### Phase 14: Documentation
- [ ] Write component API docs
- [ ] Document state management patterns
- [ ] Add inline code comments
- [ ] Create deployment guide
- [ ] Write user guide

---

## 19. KEY DIFFERENCES FROM ORIGINAL

### What to Keep from Original
- Exact color scales and opacity values
- Alert type classification and Z-index stacking
- NEXRAD station list and coordinates
- City database with priority tiers
- API endpoints and query parameters
- Timeline playback logic
- Mobile breakpoint behavior

### What to Improve in React Version
- **Type Safety**: Use TypeScript for all state and props
- **Data Fetching**: Use React Query for caching and deduplication
- **Component Reusability**: Extract common patterns (buttons, sliders, toggles)
- **Testing**: Add unit tests for utilities and integration tests for flows
- **Accessibility**: Add ARIA labels, keyboard nav, focus management
- **Performance**: Memoize expensive computations, virtualize long lists
- **Code Organization**: Separate concerns (UI, logic, API, types)

---

## 20. SUMMARY

This specification documents **every feature, interaction, and design decision** in the StormView WX application. Use this as the **single source of truth** when rebuilding the app in React.

**Key Strengths**:
- Comprehensive weather data integration (radar, alerts, outlooks, models)
- Polished UI with smooth animations and transitions
- Mobile-first responsive design
- Real-time auto-refresh system
- Detailed alert classification and visualization

**Primary Use Case**: Real-time storm monitoring and severe weather tracking for weather enthusiasts, chasers, and emergency managers.

**Target Audience**: Desktop and mobile users in the United States monitoring active weather events.

---

**End of Specification**
