// Maycotte family locations and information
window.LOCATIONS = {
  austin: {
    name: "Austin",
    state: "Texas",
    country: "USA",
    coordinates: {
      lat: 30.2672,
      lon: -97.7431
    },
    timezone: "America/Chicago",
    facts: [
      "Live Music Capital of the World",
      "Home to SXSW Festival",
      "Keep Austin Weird",
      "Texas State Capital",
      "Population: ~1 million"
    ],
    personalNote: "Where it all started",
    yearEstablished: 1839,
    averageTemp: {
      summer: "95°F",
      winter: "62°F"
    },
    landmarks: ["State Capitol", "6th Street", "Lady Bird Lake", "UT Austin"],
    familyMembers: [] // Add family member names here if desired
  },
  
  seattle: {
    name: "Seattle",
    state: "Washington",
    country: "USA",
    coordinates: {
      lat: 47.6062,
      lon: -122.3321
    },
    timezone: "America/Los_Angeles",
    facts: [
      "Home of Starbucks & Amazon",
      "The Emerald City",
      "Space Needle built in 1962",
      "Surrounded by water & mountains",
      "Population: ~750,000"
    ],
    personalNote: "Pacific Northwest connection",
    yearEstablished: 1851,
    averageTemp: {
      summer: "75°F",
      winter: "47°F"
    },
    landmarks: ["Space Needle", "Pike Place Market", "Mount Rainier", "Puget Sound"],
    familyMembers: []
  },
  
  sanMiguelDeAllende: {
    name: "San Miguel de Allende",
    state: "Guanajuato",
    country: "Mexico",
    coordinates: {
      lat: 20.9144,
      lon: -100.7450
    },
    timezone: "America/Mexico_City",
    facts: [
      "UNESCO World Heritage Site",
      "Colonial architecture from 1600s",
      "Artist and expat haven",
      "Elevation: 6,200 feet",
      "Population: ~175,000"
    ],
    personalNote: "Our Mexican heritage",
    yearEstablished: 1542,
    averageTemp: {
      summer: "80°F",
      winter: "70°F"
    },
    landmarks: ["Parroquia de San Miguel Arcángel", "El Jardín", "Instituto Allende", "Hot Springs"],
    familyMembers: []
  },
  
  sanAntonio: {
    name: "San Antonio",
    state: "Texas",
    country: "USA",
    coordinates: {
      lat: 29.4241,
      lon: -98.4936
    },
    timezone: "America/Chicago",
    facts: [
      "Remember the Alamo!",
      "7th largest US city",
      "River Walk destination",
      "NBA Spurs 5x Champions",
      "Population: ~1.5 million"
    ],
    personalNote: "Coming soon to the family",
    yearEstablished: 1718,
    averageTemp: {
      summer: "96°F",
      winter: "63°F"
    },
    landmarks: ["The Alamo", "River Walk", "Pearl District", "Six Flags Fiesta Texas"],
    familyMembers: []
  }
};

// Flight connections between cities (for future path animations)
window.FLIGHT_PATHS = [
  {
    from: "austin",
    to: "seattle",
    distance: "2,127 miles",
    flightTime: "4h 30m",
    airlines: ["Alaska", "Southwest", "United"]
  },
  {
    from: "austin",
    to: "sanMiguelDeAllende",
    distance: "896 miles",
    flightTime: "2h 30m",
    airlines: ["United", "Aeromexico"],
    note: "Usually via Mexico City"
  },
  {
    from: "austin",
    to: "sanAntonio",
    distance: "80 miles",
    driveTime: "1h 20m",
    note: "Easy drive down I-35"
  },
  {
    from: "seattle",
    to: "sanMiguelDeAllende",
    distance: "2,926 miles",
    flightTime: "7h+",
    airlines: ["Alaska", "United"],
    note: "Usually 1-2 stops"
  },
  {
    from: "seattle",
    to: "sanAntonio",
    distance: "2,237 miles",
    flightTime: "4h 45m",
    airlines: ["Alaska", "Southwest", "United"]
  },
  {
    from: "sanMiguelDeAllende",
    to: "sanAntonio",
    distance: "683 miles",
    flightTime: "3h+",
    note: "Usually via Mexico City or Houston"
  }
];

// Helper function to convert lat/lon to 3D coordinates (for future use)
window.latLonToVector3 = function(lat, lon, radius = 3) {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  
  return new THREE.Vector3(x, y, z);
};

// Helper function to get local time at location (for future use)
window.getLocalTime = function(locationKey) {
  const location = window.LOCATIONS[locationKey];
  if (!location) return null;
  
  const options = {
    timeZone: location.timezone,
    hour12: true,
    hour: 'numeric',
    minute: '2-digit'
  };
  
  return new Date().toLocaleTimeString('en-US', options);
};