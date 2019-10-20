/* global WorldWind */

$(document).ready(function () {
  "use strict";
  // Set your Bing Maps key which is used when requesting Bing Maps resources.
  // Without your own key you will be using a limited WorldWind developer's key.
  // See: https://www.bingmapsportal.com/ to register for your own key and then enter it below:
  const BING_API_KEY = "AuAO63SAow2wLNzyIQtjRTAcprh5V39NI1O19wjo-QgBzU0MVH5F2gdPsDxwHChH";
  if (BING_API_KEY) {
    // Initialize WorldWind properties before creating the first WorldWindow
    WorldWind.BingMapsKey = BING_API_KEY;
  } else {
    console.error("app.js: A Bing API key is required to use the Bing maps in production. Get your API key at https://www.bingmapsportal.com/");
  }

  // Set the MapQuest API key used for the Nominatim service.
  // Get your own key at https://developer.mapquest.com/
  // Without your own key you will be using a limited WorldWind developer's key.
  const MAPQUEST_API_KEY = "YHyiTrOaB3AoJrMR0SWPQuKXGddPKpx9";


  /**
   * The Globe encapulates the WorldWindow object (wwd) and provides application
   * specific logic for interacting with layers.
   * @param {String} canvasId
   * @param {String|null} projectionName
   * @returns {Globe}
   */
  class Globe {
    constructor(canvasId, projectionName) {
      // Create a WorldWindow globe on the specified HTML5 canvas
      this.wwd = new WorldWind.WorldWindow(canvasId);

      // Projection support
      this.roundGlobe = this.wwd.globe;
      this.flatGlobe = null;
      if (projectionName) {
        this.changeProjection(projectionName);
      }

      // A map of category and 'observable' timestamp pairs
      this.categoryTimestamps = new Map();

      // Add a BMNGOneImageLayer background layer. We're overriding the default 
      // minimum altitude of the BMNGOneImageLayer so this layer always available.
      this.addLayer(new WorldWind.BMNGOneImageLayer(), {
        category: "background",
        minActiveAltitude: 0
      });

    }

    get projectionNames() {
      return [
        "3D",
        "Equirectangular",
        "Mercator",
        "North Polar",
        "South Polar",
        "North UPS",
        "South UPS",
        "North Gnomonic",
        "South Gnomonic"
      ];
    }

    changeProjection(projectionName) {
      if (projectionName === "3D") {
        if (!this.roundGlobe) {
          this.roundGlobe = new WorldWind.Globe(new WorldWind.EarthElevationModel());
        }
        if (this.wwd.globe !== this.roundGlobe) {
          this.wwd.globe = this.roundGlobe;
        }
      } else {
        if (!this.flatGlobe) {
          this.flatGlobe = new WorldWind.Globe2D();
        }
        if (projectionName === "Equirectangular") {
          this.flatGlobe.projection = new WorldWind.ProjectionEquirectangular();
        } else if (projectionName === "Mercator") {
          this.flatGlobe.projection = new WorldWind.ProjectionMercator();
        } else if (projectionName === "North Polar") {
          this.flatGlobe.projection = new WorldWind.ProjectionPolarEquidistant("North");
        } else if (projectionName === "South Polar") {
          this.flatGlobe.projection = new WorldWind.ProjectionPolarEquidistant("South");
        } else if (projectionName === "North UPS") {
          this.flatGlobe.projection = new WorldWind.ProjectionUPS("North");
        } else if (projectionName === "South UPS") {
          this.flatGlobe.projection = new WorldWind.ProjectionUPS("South");
        } else if (projectionName === "North Gnomonic") {
          this.flatGlobe.projection = new WorldWind.ProjectionGnomonic("North");
        } else if (projectionName === "South Gnomonic") {
          this.flatGlobe.projection = new WorldWind.ProjectionGnomonic("South");
        }
        if (this.wwd.globe !== this.flatGlobe) {
          this.wwd.globe = this.flatGlobe;
        }
      }
    }

    /**
     * Returns a new array of layers within the given category.
     * @param {String} category E.g., "base", "overlay" or "setting".
     * @returns {Array}
     */
    getLayers(category) {
      return this.wwd.layers.filter(layer => layer.category === category);
    }

    /**
     * Add a layer to the globe and applies options object properties to the 
     * the layer.
     * @param {WorldWind.Layer} layer
     * @param {Object|null} options E.g., {category: "base", enabled: true}
     */
    addLayer(layer, options) {
      // Copy all properties defined on the options object to the layer
      if (options) {
        for (let prop in options) {
          if (!options.hasOwnProperty(prop)) {
            continue; // skip inherited props
          }
          layer[prop] = options[prop];
        }
      }
      // Assign a category property for layer management 
      if (typeof layer.category === 'undefined') {
        layer.category = 'overlay'; // default category
      }

      // Assign a unique layer ID to ease layer management 
      layer.uniqueId = this.nextLayerId++;
      // Add the layer to the globe
      this.wwd.addLayer(layer);
      // Signal a change in the category
      this.updateCategoryTimestamp(layer.category);
    }

    /**
     * Toggles the enabled state of the given layer and updates the layer
     * catetory timestamp. Applies a rule to the 'base' layers the ensures
     * only one base layer is enabled.
     * @param {WorldWind.Layer} layer
     */
    toggleLayer(layer) {
      // Apply rule: only one "base" layer can be enabled at a time
      if (layer.category === 'base') {
        this.wwd.layers.forEach(function (item) {
          if (item.category === 'base' && item !== layer) {
            item.enabled = false;
          }
        });
      }
      // Toggle the selected layer's visibility
      layer.enabled = !layer.enabled;
      // Trigger a redraw so the globe shows the new layer state ASAP
      this.wwd.redraw();
      // Signal a change in the category
      this.updateCategoryTimestamp(layer.category);

      console.log(layer.displayName)
      let modalDescription = '';
      switch (layer.displayName) {
      case '➰ Aerosol Optical Thickness': modalDescription = `Tiny solid and liquid particles suspended in the atmosphere are called aerosols. Examples of aerosols include windblown dust, sea salts, volcanic ash, smoke from fires, and pollution from factories. These particles are important to scientists because they can affect climate, weather, and people's health. Aerosols affect climate by scattering sunlight back into space and cooling the surface.  Aerosols also help cool Earth in another way -- they act like "seeds" to help form clouds.  The particles give water droplets something to cling to as the droplets form and gather in the air to make clouds.  Clouds give shade to the surface by reflecting sunlight back into space. People's health is affected when they breathe in smoke or pollution particles.  Such aerosols in our lungs can cause asthma or cancer of other serious health problems.  But scientists do not fully understand all of the ways that aerosols affect Earth's environment.  To help them in their studies, scientists use satellites to map where there were large amounts of aerosol on a given day, or over a span of days.`; break;
      case '➿ Aerosol Particle Radius': modalDescription = `Tiny solid and liquid particles suspended in the atmosphere are called <em>aerosols</em>.  These particles are important to scientists because they can affect climate, weather, and people's health.  Some aerosols come from natural sources, such as dust, volcanic eruptions, and sea salts.  Some aerosols are produced by humans, such as pollution from industries or automobiles, or smoke from fires.  Using satellites scientists can tell whether a given plume of aerosols came from a natural source, or if is pollution produced by people.  Two important clues about aerosols' sources are particle size and location of the plume.  Natural aerosols (such as dust and sea salts) tend to be larger particles than man-made aerosols (such as smoke and industrial pollution).`; break;
      case '☄️ Albedo': modalDescription = `When sunlight reaches the Earth's surface, some of it is absorbed and some is reflected. The relative amount (ratio) of light that a surface reflects compared to the total sunlight that falls on it is called <em>albedo</em>. Surfaces that reflect a lot of the light falling on them are bright, and they have a high albedo. Surfaces that don&rsquo;t reflect much light are dark, and they have a low albedo. Snow has a high a albedo, and forests have a low albedo.`; break;
      case '🌞 Average Land Surface Temperature Day': modalDescription = `Land surface temperature is how hot the ground feels to the touch. If you want to know whether temperatures at some place at a specific time of year are unusually warm or cold, you need to compare them to the average temperatures for that place over many years. These maps show the average weekly or monthly daytime land surface temperatures for 2001-2010.`; break;
      case '🌚 Average Land Surface Temperature Night': modalDescription = `Land surface temperature is how hot the ground feels to the touch. If you want to know whether temperatures at some place at a specific time of year are unusually warm or cold, you need to compare them to the average temperatures for that place over many years. These maps show the average weekly or monthly nighttime land surface temperatures for 2001-2010.`; break;
      case '💮 Bathymetry': modalDescription = `Beneath the waters of the world's ocean, the Earth's surface isn't flat like the bottom of a glass or large bowl. There are giant mountain ranges and huge cracks where the ocean floor is ripping apart. Underwater volcanoes are slowly building up into mountains that may one day rise above the sea surface as islands. Because of these features, the depth of the water isn't the same everywhere in the ocean. Bathymetry is the measurement of how deep the water is at various places and the shape of the land underwater. In these maps, different shades of color represent different water depths. The data come from the General Bathymetric Chart of the Oceans, produced by the International Hydrographic Organization (IHO) and the United Nations' (UNESCO) Intergovernmental Oceanographic Commission (IOC).`; break;
      case '🔗 Carbon Monoxide': modalDescription = `Colorless, odorless, and poisonous, carbon monoxide is a gas that comes from burning fossil fuels, like the gas in cars, and burning vegetation. Carbon monoxide is not one of the gases that is causing global warming, but it is one of the air pollutants that leads to smog. These data sets show monthly averages of carbon monoxide across the Earth measured by the Measurements of Pollution In The Troposphere (MOPITT) sensor on NASA's Terra satellite. Different colors show different amounts of the gas in the troposphere, the layer of the atmosphere closest to the Earth's surface, at an altitude of about 12,000 feet.`; break;
      case '⚗️ Chlorophyll Concentration': modalDescription = `This map shows where tiny, floating plants live in the ocean.  These plants, called <em>phytoplankton</em>, are an important part of the ocean's food chain because many animals (such as small fish and whales) feed on them.  Scientists can learn a lot about the ocean by observing where and when phytoplankton grow in large numbers.  Scientists use satellites to measure how much phytoplankton are growing in the ocean by observing the color of the light reflected from the shallow depths of the water.  Phytoplankton contain a photosynthetic pigment called chlorophyll that lends them a greenish color. When phytoplankton grow in large numbers they make the ocean appear greenish.  These maps made from satellite observations show where and how much phytoplankton were growing on a given day, or over a span of days.  The black areas show where the satellite could not measure phytoplankton.`; break;
      case '☁️ Cloud Fraction': modalDescription = `Looking at Earth from outer space, clouds are easy to spot. Clouds are draped all around Earth like bright white decorations.  Clouds are important to scientists because they reflect the Sun's light back to space and give shade to the surface.  They also bring rain, which is important because all plants and animals need freshwater to live.  These maps made from NASA satellite observations show how much of Earth's surface is covered by clouds for a given day, or over a span of days.`; break;
      case '💨 Cloud Optical Thickness': modalDescription = `More than just the idle stuff of daydreams, clouds help control the flow of light and heat around our world.  Because there are so many clouds spread over such large areas of Earth, they are a very important part of our world's climate system.  Clouds have the ability to cool our planet, or they can help to warm it. Because there are so many different kinds of clouds, and because they move and change so fast, they are hard to understand and even harder to predict.  Scientists want to know how much sunlight clouds reflect and how much sunlight passes through clouds to reach Earth's surface.  By measuring how much sunlight gets scattered by clouds back up into space, scientists can better understand how much clouds influence Earth's climate.`; break;
      case '💧 Cloud Water Content': modalDescription = `Clouds are made up of trillions of tiny water droplets and ice crystals.  Have you ever wondered how much water all those particles add up to?  Of course, the answer is different for different types of clouds.  Thin, wispy cirrus clouds contain much less water than thick, puffy-looking cumulus clouds.  Scientists want to measure how much water is in a cloud because that information helps them to better understand where and how much water moves back and forth between Earth's surface and atmosphere.  Knowing how much water is in a cloud also helps them to better estimate how much sunlight that cloud will reflect back into space and how much warmth that cloud traps near Earth's surface.  Today, scientists use NASA satellites to measure how much water is in clouds all over the world.  The colors on these maps show how many grams of water per square meter you would get if you squashed all the water out of the clouds into a flat layer on the ground.  White areas show clouds with a lot of water, pink shades show less water, and purple shows little or no cloud water.`; break;
      case '🎆 False Color': modalDescription = `These images show Earth's surface and clouds in false colors. The images might look a little funny, sort of like a TV picture that needs to be fixed. That's because the images include more than just the red, green, and blue light that our eyes can see, but also infrared light. Infrared light is invisible to our eyes, but not to satellites.  NASA uses satellites in space to gather images like these over the entire planet every day. Scientists use satellite sensors to measure how much infrared light Earth reflects back up into space.  By assigning colors (red, green, or blue) to measurements of infrared light, we can see and understand the resulting pictures -- called "false-color images." In the false-color images available in NEO, areas with plants look bright green while deserts look tan.  Cold things appear blue: the colder something is, the brighter blue it will look. Ice and snow on the ground show up as bright turquoise.  Depending upon how high they are and how cold they are, clouds' colors range from white, to baby blue, to bright turquoise.  Notice how water and clouds in false-color images look very different than they do in true-color images.  Water is very dark, almost black, which makes it much easier to see lakes or flooded lands.`; break;
      case '🔥 Active Fires': modalDescription = `Fire is a recurring part of nature.  Wildfires can be caused by lightning striking a forest canopy or, in a few isolated cases, by lava or hot rocks ejected from erupting volcanoes.  Most fires worldwide are started by humans, sometimes accidentally and sometimes on purpose.  Not all fires are bad.  Fire clears away dead and dying underbrush, which can help restore forest ecosystems to good health.  Humans use fire as a tool in slash-and-burn agriculture to speed up the process of breaking down unwanted vegetation into the soil.  Humans also use fire to clear away old-growth forests to make room for living spaces, roads, and fields for raising crops and cattle.  But not all fires are good.  Wildfires can destroy natural resources and human structures.  Globally, fire plays a major role in Earth's carbon cycle by releasing carbon into the air, and by consuming trees that would otherwise absorb carbon from the air during photosynthesis.  These maps show the locations of actively burning fires around the world, detected by instruments aboard NASA satellites.`; break;
      case '🏜 Global Temperature Anomaly': modalDescription = `These maps depict how much warmer or colder a region may be in a given month compared to the norm for that same month in the same region from 1951-1980. These maps do not depict absolute temperature but instead show temperature anomalies, or how much it has changed.`; break;
      case '🏵 Leaf Area Index': modalDescription = `Have you ever flown in a plane over a forest, or seen a picture of a forest canopy taken from above?  If so, you probably noticed the forest canopy was colored shades of dark green.  The trees' and plants' leaves give the forest its lush green appearance.  The more leaves there are in a forested area, the greener the tree canopy.  Have you ever wondered how many leaves there are in a forest?  Today, scientists use NASA satellites to map <em>leaf area index</em> &mdash; images processed to show how much of an area is covered by leaves.  For example, a leaf area index of one means the area is entirely covered by one layer of leaves. Knowing the total area covered by leaves helps scientists monitor how much water, carbon, and energy the trees and plants are exchanging with the air above and the ground below.`; break;
      case '🎑 Net Primary Productivity': modalDescription = `Because carbon dioxide gas helps to warm our world, scientists want to better understand where carbon dioxide comes from and where it goes.  Plants play an important role in the movements of carbon dioxide throughout Earth's environment.  Living plants both take in carbon dioxide from the air and put out carbon dioxide to the air.  So scientists use satellites to measure the difference between how much carbon dioxide is taken in by plants compared to how much is put out by them.  This difference is total amount of carbon dioxide taken in by plants, called <em>net primary productivity</em>.  The maps here show plants' net primary productivity for the whole globe.`; break;
      case '🎫 Net Radiation': modalDescription = `Every day, the Sun shines on Earth. Ice and snow and bright white clouds reflect some light back into space. The rest of the light is absorbed by the atmosphere, land surfaces and oceans, and this absorption keeps Earth warm. Like other warm objects, Earth emits heat into space. The difference between how much solar energy enters the Earth system and how much heat energy escapes into space is called &quot;net radiation.&quot; Some places absorb more energy than they give off back to space, so they have an energy surplus. Other places lose more energy to space than they absorb, so they have an energy deficit.`; break;
      case '♨️ Nitrogen Dioxide': modalDescription = `Nitrogen dioxide (NO<sub>2</sub>) is a gas that occurs naturally in our atmosphere. NO<sub>2</sub> plays an important role in the formation of ozone in the air we breathe. Ozone high in the atmosphere helps us. It is like sunscreen, and it protects us from harmful ultraviolet (UV) rays from the Sun. Near the ground though, ozone is a pollutant. It damages our lungs and harms plants, including the plants we eat. Ozone occurs naturally in the air we breathe, but there's not enough of it to hurt us. Unhealthy levels of ozone form when there is a lot of NO<sub>2</sub> in the air. NO<sub>2</sub>&mdash;and ozone&mdash;concentrations are usually highest in cities, since NO<sub>2</sub> is released into the atmosphere when we burn gas in our cars or coal in our power plants, both things that happen more in cities. Ozone pollution is worse in summer. NO<sub>2</sub> is also unhealthy to breathe in high concentrations, such as on busy streets and highways where there are lots of cars and trucks. When driving, it is typically a good idea to keep the car windows rolled up and the car's ventilation set to 'recirculate'; so as to keep pollution out of the interior of the car. It is also important to reduce outdoor activities like playing or jogging if government officials warn you that air quality will be bad on a certain day.`; break;
      case '♒️ Outgoing Longwave Radiation': modalDescription = `Light energy travels in waves, but not all the waves are the same. The kind of light our eyes can see is only a tiny part of the energy that exists in the universe. Other kinds of energy are invisible, like the energy that makes our hands feel warm when we hold them over a fire, or the energy that cooks our food in the microwave. When Earth absorbs sunlight, it heats up. The heat, or &quot;outgoing longwave radiation,&quot; radiates back into space. Satellites measure this radiation as it leaves the top of Earth&apos;s atmosphere. The hotter a place is, the more energy it radiates.`; break;
      case '🌌 Ozone': modalDescription = `Ozone is a gas made out of oxygen. The oxygen that we breathe is two oxygen atoms joined together. Ozone is three oxygen atoms joined together.</p><p>Near the ground, human activity such as burning coal or gasoline creates ozone. High amounts of ozone at ground level harm plant life and damages peoples&rsquo; lungs.</p><p>High in Earth&rsquo;s atmosphere (miles above the surface), ozone forms from natural processes. There, ozone is good for life on Earth because it shields us from ultraviolet sunlight that causes sunburns, skin cancer, and damage to the eyes.</p><p>So while humans want to limit ozone near the ground where we might breathe it, we want a healthy layer of ozone high in the atmosphere to help protect life on our planet.<`; break;
      case '💠 Permafrost': modalDescription = `In really cold places, the ground can stay frozen all year. If the ground stays frozen at least two years in a row, it is called &quot;permafrost.&quot; Different places have different amounts of permafrost. It may only occur in patches, or it may cover a large area. The colors on this map show different amounts of permafrost in areas of the Northern Hemisphere. Widespread melting of permafrost is one sign of global warming.`; break;
      case '👥 Population': modalDescription = `This map shows how many people live in different areas on Earth. The map is divided into numerous small boxes, called &quot;grids.&quot; Each grid box is about 1 kilometer long by one kilometer wide, and it is color coded to show how many people live there. Lighter areas have fewer people. The red dots scattered across most countries show cities, where many people live in a small area.`; break;
      case '💦 Rainfall': modalDescription = `Rainfall is essential for life on Earth.  Rain is a main source of fresh water for plants and animals.  These maps show where and how much rain fell around the world on the dates shown. Notice that most rain falls near the equator.  Notice also that more rain falls on the ocean than on land.  The NASA instrument that made these rainfall measurements flies on a satellite orbiting our world near the equator, so it only measures rainfall near the equator and not at high latitudes, nor in Earth's polar regions.`; break;
      case '🌸 Reflected Shortwave Radiation': modalDescription = `If you look at Mars in the night sky, the planet is little more than a glowing dot. From Mars, Earth would have the same star-like appearance. What gives the planets this light? Do they shine like a star? No. The light is mostly reflected sunlight. These images show how much sunlight Earth reflects. Bright parts of Earth like snow, ice, and clouds, reflect the most light; dark surfaces, like the oceans, reflect less light. Earth&apos;s average temperature is determined by the balance between how much sunlight Earth reflects, how much it absorbs, and how much heat it gives off.`; break;
      case '⛄️ Sea Ice Concentration and Snow Extent, Global': modalDescription = `The colors on this collection of daily global maps show where the land and ocean was covered by snow (gray and white) and ice (blue).  If you browse through these maps you will notice that snow and ice cover Earth's polar regions with bright white caps all year round.  But at lower latitudes the extent of snow and sea ice changes as the seasons change.  Scientists measure how much of our world is covered by snow and ice to help them better understand and predict changes in Earth's weather and climate.`; break;
      case '🔷 Sea Surface Salinity': modalDescription = `These maps show the saltiness, also known as &ldquo;salinity,&rdquo; of the ocean surface. The ocean's salinity is key to studying the water cycle and ocean circulation, both of which are important to Earth's climate.</p><p>Throughout Earth's history, the weathering of rocks has delivered minerals, including salt, into the ocean. Over decades, this amount of salt in ocean basins has been relatively stable. The water cycle operates on much faster time scales, however, causing changes in salinity patterns. For example, freshwater enters the ocean from rivers, melting ice, rain, and snow. These processes tend to make the ocean less salty. On the other hand, processes that cause freshwater to exit the ocean&mdash;such as evaporation and formation of sea ice&mdash;make the ocean saltier.</p><p>Differences in salinity play a major role in moving seawater around the globe. Below the wind-blown ocean surface, salinity and temperature drive circulation by controlling the &ldquo;density&rdquo; (mass per unit volume) of seawater.  The weight of dissolved salt increases water's density and when salinities are equal, colder water is denser than warmer water. In addition to moving salt and water, density-driven circulation is crucial to moving heat around our planet. The movement of heat by our ocean&mdash;for example, from the equator to the poles&mdash;is crucial to keeping Earth's climate &ldquo;just right.&rdquo;</p><p>These maps are made from satellite observations which cover the globe every week. The black areas show where data were not available, usually close to the coasts where strong signals from the land can interfere with accurate measurements.`; break;
      case '🌊 Sea Surface Temperature': modalDescription = `Sea surface temperature is the temperature of the top millimeter of the ocean's surface. Sea surface temperatures influence weather, including hurricanes, as well as plant and animal life in the ocean. Like Earth's land surface, sea surface temperatures are warmer near the equator and colder near the poles. Currents like giant rivers move warm and cold water around the world's oceans. Some of these currents flow on the surface, and they are obvious in sea surface temperature images.</p><p>Warm ocean waters help form clouds and affect weather patterns. The sea's surface temperature is also correlated to the availability of tiny ocean plants, called 'phytoplankton'. For all of these reasons scientists monitor the sea's surface temperature.  These maps show satellite measurements of the sea's surface temperature for a given day, or for a span of days. These data are collected by an ongoing series of National Oceanic and Atmospheric Administration (NOAA) satellites.`; break;
      case '❄️ Snow Cover': modalDescription = `When air temperature falls below freezing (0&deg;Celsius), the water droplets in clouds harden into ice crystals.  Such crystals may grow into large, lacey snowflakes; or they may stick together to form odd-shaped clusters of ice crystals.  When they grow heavy enough, the ice crystals fall to the ground as snow.  If the ground temperature is also below freezing, the snow can build up into a bright white blanket covering the surface.  Snow cover is an important part of Earth's environment.  Because it reflects most of the sunlight that hits it, snow helps to cool Earth's surface.  Many areas of the world rely on snowmelt for drinking water and water for their crops.  So scientists monitor where and how much of Earth's landscape is covered by snow.`; break;
      case '☀️ Solar Insolation': modalDescription = `These maps show where and how much sunlight fell on Earth&apos;s surface during the time period indicated.  Scientists call this measure 'solar insolation'.  Knowing how much of the Sun&apos;s energy reaches the surface helps scientists understand weather and climate patterns as well as patterns of plant growth around our world.  Solar insolation maps are also useful to engineers who design solar panels and batteries designed to convert energy from the Sun into electricity to power appliances in our homes and work places.`; break;
      case '🏔 Topography': modalDescription = `Land topography allows us to make maps of the features of the surface of the Earth. Topographic maps show the location, height, and shape of features like mountains and valleys, rivers, even the craters on volcanoes. Another way to think of topographic maps is that they are a picture of the three-dimensional (3-D) structure of the surface of the Earth. Flat maps can create a 3-D effect by making some parts of the map dark and other parts light. This is called "shading" because it makes features on the surface look like they are casting shadows. This topographic map is made from data collected from three sources: NASA's Space Shuttle, Canada's Radarsat satellite, and topographic maps made by the U.S. Geological Survey.`; break;
      case '📸 True Color': modalDescription = `These images show the Earth's surface and clouds in true color, like a photograph. NASA uses satellites in space to gather images like these over the whole world every day. Scientists use these images to track changes on Earth's surface. Notice the shapes and patterns of the colors across the lands. Dark green areas show where there are many plants. Brown areas are where the satellite sensor sees more of the bare land surface because there are few plants. White areas are either snow or clouds. Where on Earth would you like to explore?`; break;
      case '✨ UV Index': modalDescription = `The UV Index is a measure of the intensity of ultraviolet (UV) rays from the Sun. Some exposure to the Sun&rsquo;s rays is beneficial as it helps our bodies produce vitamin D. But too much exposure to UV rays can have harmful effects. In the short-term, skin exposed to UV rays can burn. A &lsquo;sunburn&rsquo; can happen within minutes or over the course of several hours. Over the long term, UV exposure can result in premature aging, skin cancer, and damage to your eyes.</p><p>The UV index climatology shows how much UV exposure a person could get on average during each month. The index is a scale of 0 to 16+, with 0 representing minimal UV exposure risk and values higher than 11 posing an extreme risk. To inform people about the risk one can expect from UV rays, the National Weather Service and the U.S. Environmental Protection Agency (EPA) have developed a <a href="http://www2.epa.gov/sunwise/uv-index-scale">daily UV Index,</a> which is based partly on this climatology.`; break;
    }

      let infoContent = layer.displayName + '\n\n' + modalDescription;
      document.querySelector("body > div > div.cart > p.cartContent").innerText = infoContent;

      /* // Print the data of WMS Object 
      const getCircularReplacer = () => {
        const seen = new WeakSet();
        return (key, value) => {
          if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
              return;
            }
            seen.add(value);
          }
          return value;
        };
      };
      console.log(JSON.stringify(layer, getCircularReplacer()));
      */
    }

    /**
     * Returns an observable containing the last update timestamp for the category.
     * @param {String} category
     * @returns {Observable} 
     */
    getCategoryTimestamp(category) {
      if (!this.categoryTimestamps.has(category)) {
        this.categoryTimestamps.set(category, ko.observable());
      }
      return this.categoryTimestamps.get(category);
    }

    /**
     * Updates the timestamp for the given category.
     * @param {String} category
     */
    updateCategoryTimestamp(category) {
      let timestamp = this.getCategoryTimestamp(category);
      timestamp(new Date());
    }
    /**
     * Returns the first layer with the given name.
     * @param {String} name
     * @returns {WorldWind.Layer|null}
     */
    findLayerByName(name) {
      let layers = this.wwd.layers.filter(layer => layer.displayName === name);
      return layers.length > 0 ? layers[0] : null;
    }
  }

  /**
   * loadLayers is a utility function used by the view models to copy
   * layers into an observable array. The top-most layer is first in the
   * observable array.
   * @param {Array} layers
   * @param {ko.observableArray} observableArray 
   */
  function loadLayers(layers, observableArray) {
    observableArray.removeAll();
    // Reverse the order of the layers to the top-most layer is first
    layers.reverse().forEach(layer => observableArray.push(layer));
  };

  /**
   * Layers view mode.
   * @param {Globe} globe
   * @returns {undefined}
   */
  function LayersViewModel(globe) {
    let self = this;
    self.baseLayers = ko.observableArray(globe.getLayers('base').reverse());
    self.overlayLayers = ko.observableArray(globe.getLayers('overlay').reverse());
    // Update the view model whenever the model changes
    globe.getCategoryTimestamp('base').subscribe(newValue =>
      loadLayers(globe.getLayers('base'), self.baseLayers));
    globe.getCategoryTimestamp('overlay').subscribe(newValue =>
      loadLayers(globe.getLayers('overlay'), self.overlayLayers));
    // Button click event handler
    self.toggleLayer = function (layer) {
      globe.toggleLayer(layer);
    };
  }

  /**
   * Settings view model.
   * @param {Globe} globe
   */
  function SettingsViewModel(globe) {
    let self = this;
    self.settingLayers = ko.observableArray(globe.getLayers('setting').reverse());
    self.debugLayers = ko.observableArray(globe.getLayers('debug').reverse());
    // Update this view model whenever one of the layer categories change
    globe.getCategoryTimestamp('setting').subscribe(newValue =>
      loadLayers(globe.getLayers('setting'), self.settingLayers));
    globe.getCategoryTimestamp('debug').subscribe(newValue =>
      loadLayers(globe.getLayers('debug'), self.debugLayers));
    // Button click event handler
    self.toggleLayer = function (layer) {
      globe.toggleLayer(layer);
    };
  }

  /**
   * Tools view model for tools palette on the globe
   * @param {Globe} globe
   * @param {MarkersViewModel} markers
   * @returns {ToolsViewModel}
   */
  function ToolsViewModel(globe, markers) {
    let self = this,
      imagePath = "https://unpkg.com/worldwindjs@1.5.90/build/dist/images/pushpins/";
    // An array of pushpin marker images
    self.markerPalette = [
      imagePath + "castshadow-red.png",
      imagePath + "castshadow-green.png",
      imagePath + "castshadow-blue.png",
      imagePath + "castshadow-orange.png",
      imagePath + "castshadow-teal.png",
      imagePath + "castshadow-purple.png",
      imagePath + "castshadow-white.png",
      imagePath + "castshadow-black.png"
    ];
    // The currently selected marker icon 
    self.selectedMarkerImage = ko.observable(self.markerPalette[0]);
    // Callback invoked by the Click/Drop event handler
    self.dropCallback = null;
    // The object dropped on the globe at the click location
    self.dropObject = null;
    // Observable boolean indicating that click/drop is armed
    self.isDropArmed = ko.observable(false);
    // Change the globe's cursor to crosshairs when drop is armed
    self.isDropArmed.subscribe(armed =>
      $(globe.wwd.canvas).css("cursor", armed ? "crosshair" : "default"));
    // Button click event handler to arm the drop
    self.armDropMarker = function () {
      self.isDropArmed(true);
      self.dropCallback = self.dropMarkerCallback;
      self.dropObject = self.selectedMarkerImage();
    };

    // Set up the common placemark attributes used in the dropMarkerCallback
    let commonAttributes = new WorldWind.PlacemarkAttributes(null);
    commonAttributes.imageScale = 1;
    commonAttributes.imageOffset = new WorldWind.Offset(
      WorldWind.OFFSET_FRACTION, 0.3,
      WorldWind.OFFSET_FRACTION, 0.0);
    commonAttributes.imageColor = WorldWind.Color.WHITE;
    commonAttributes.labelAttributes.offset = new WorldWind.Offset(
      WorldWind.OFFSET_FRACTION, 0.5,
      WorldWind.OFFSET_FRACTION, 1.0);
    commonAttributes.labelAttributes.color = WorldWind.Color.YELLOW;
    commonAttributes.drawLeaderLine = true;
    commonAttributes.leaderLineAttributes.outlineColor = WorldWind.Color.RED;
    /**
     * "Drop" action callback creates and adds a marker (WorldWind.Placemark) to the globe.
     *
     * @param {WorldWind.Location} position
     */
    self.dropMarkerCallback = function (position) {
      let attributes = new WorldWind.PlacemarkAttributes(commonAttributes);
      attributes.imageSource = self.selectedMarkerImage();

      let placemark = new WorldWind.Placemark(position, /*eyeDistanceScaling*/ true, attributes);
      placemark.label = "Lat " + position.latitude.toPrecision(4).toString() + "\n" + "Lon " + position.longitude.toPrecision(5).toString();
      placemark.altitudeMode = WorldWind.CLAMP_TO_GROUND;
      placemark.eyeDistanceScalingThreshold = 2500000;

      // Add the placemark to the layer and to the observable array
      let layer = globe.findLayerByName("📌 Markers");
      layer.addRenderable(placemark);
      markers.addMarker(placemark);
    };

    /**
     * Handles a click on the WorldWindow. If a "drop" action callback has been
     * defined, it invokes the function with the picked location.
     * @param {Object} event
     */
    self.handleClick = function (event) {
      if (!self.isDropArmed()) {
        return;
      }
      // Get the clicked window coords
      let type = event.type,
        x, y;
      switch (type) {
        case 'click':
          x = event.clientX;
          y = event.clientY;
          break;
        case 'touchend':
          if (!event.changedTouches[0]) {
            return;
          }
          x = event.changedTouches[0].clientX;
          y = event.changedTouches[0].clientY;
          break;
      }
      if (self.dropCallback) {
        // Get all the picked items 
        let pickList = globe.wwd.pickTerrain(globe.wwd.canvasCoordinates(x, y));
        // Terrain should be one of the items if the globe was clicked
        let terrain = pickList.terrainObject();
        if (terrain) {
          self.dropCallback(terrain.position, self.dropObject);
        }
      }
      self.isDropArmed(false);
      event.stopImmediatePropagation();
    };

    // Assign a click event handlers to the WorldWindow for Click/Drop support
    globe.wwd.addEventListener('click', self.handleClick);
    globe.wwd.addEventListener('touchend', self.handleClick);
  }


  /**
   * Markers view model.
   * @param {Globe} globe
   * @returns {MarkersViewModel}
   */
  function MarkersViewModel(globe) {
    let self = this;
    // Observable array of markers displayed in the view
    self.markers = ko.observableArray();

    /**
     * Adds a marker to the view model
     * @param {WorldWind.Placemark} marker
     */
    self.addMarker = function (marker) {
      self.markers.push(marker);
    };

    /** 
     * "Goto" function centers the globe on the given marker.
     * @param {WorldWind.Placemark} marker
     */
    self.gotoMarker = function (marker) {
      globe.wwd.goTo(new WorldWind.Location(marker.position.latitude, marker.position.longitude));
    };

    /** 
     * "Edit" function invokes a modal dialog to edit the marker attributes.
     * @param {WorldWind.Placemark} marker
     */
    self.editMarker = function (marker) {
      // TODO bind marker to dialog, maybe create an individual marker view-model
      //                        let options = {};
      //                        $('#editMarkerModal').modal(options)
    };

    /** 
     * "Remove" function removes a marker from the globe.
     * @param {WorldWind.Placemark} marker
     */
    self.removeMarker = function (marker) {
      // Find and remove the marker from the layer and the observable array
      let markerLayer = globe.findLayerByName("Markers");
      for (let i = 0, max = self.markers().length; i < max; i++) {
        let placemark = markerLayer.renderables[i];
        if (placemark === marker) {
          markerLayer.renderables.splice(i, 1);
          self.markers.remove(marker);
          break;
        }
      }
    };
  }
  /**
   * Search view model. Uses the MapQuest Nominatim API. 
   * Requires an access key. See: https://developer.mapquest.com/
   * @param {Globe} globe
   * @param {Function} preview Function to preview the results
   * @returns {SearchViewModel}
   */
  function SearchViewModel(globe, preview) {
    let self = this;
    self.geocoder = new WorldWind.NominatimGeocoder();
    self.searchText = ko.observable('');
    self.performSearch = function () {
      if (!MAPQUEST_API_KEY) {
        console.error("SearchViewModel: A MapQuest API key is required to use the geocoder in production. Get your API key at https://developer.mapquest.com/");
      }
      // Get the value from the observable
      let queryString = self.searchText();
      if (queryString) {
        if (queryString.match(WorldWind.WWUtil.latLonRegex)) {
          // Treat the text as a lat, lon pair 
          let tokens = queryString.split(",");
          let latitude = parseFloat(tokens[0]);
          let longitude = parseFloat(tokens[1]);
          // Center the globe on the lat, lon
          globe.wwd.goTo(new WorldWind.Location(latitude, longitude));
        } else {
          // Treat the text as an address or place name
          self.geocoder.lookup(queryString, function (geocoder, results) {
            if (results.length > 0) {
              // Open the modal dialog to preview and select a result
              preview(results);
            }
          }, MAPQUEST_API_KEY);
        }
      }
    };
  }

  /**
   * Define the view model for the Search Preview.
   * @param {WorldWindow} primaryGlobe
   * @returns {PreviewViewModel}
   */
  function PreviewViewModel(primaryGlobe) {
    let self = this;
    // Show a warning message about the MapQuest API key if missing
    this.showApiWarning = (MAPQUEST_API_KEY === null || MAPQUEST_API_KEY === "");
    // Create secondary globe with a 2D Mercator projection for the preview
    this.previewGlobe = new Globe("preview-canvas", "Mercator");
    let resultsLayer = new WorldWind.RenderableLayer("Results");
    let bingMapsLayer = new WorldWind.BingRoadsLayer();
    bingMapsLayer.detailControl = 1.25; // Show next level-of-detail sooner. Default is 1.75
    this.previewGlobe.addLayer(bingMapsLayer);
    this.previewGlobe.addLayer(resultsLayer);
    // Set up the common placemark attributes for the results
    let placemarkAttributes = new WorldWind.PlacemarkAttributes(null);
    placemarkAttributes.imageSource = WorldWind.configuration.baseUrl + "images/pushpins/castshadow-red.png";
    placemarkAttributes.imageScale = 0.5;
    placemarkAttributes.imageOffset = new WorldWind.Offset(
      WorldWind.OFFSET_FRACTION, 0.3,
      WorldWind.OFFSET_FRACTION, 0.0);
    // Create an observable array who's contents are displayed in the preview
    this.searchResults = ko.observableArray();
    this.selected = ko.observable();
    // Shows the given search results in a table with a preview globe/map
    this.previewResults = function (results) {
      if (results.length === 0) {
        return;
      }
      // Clear the previous results
      self.searchResults.removeAll();
      resultsLayer.removeAllRenderables();
      // Add the results to the observable array
      results.map(item => self.searchResults.push(item));
      // Create a simple placemark for each result
      for (let i = 0, max = results.length; i < max; i++) {
        let item = results[i];
        let placemark = new WorldWind.Placemark(
          new WorldWind.Position(
            parseFloat(item.lat),
            parseFloat(item.lon), 100));
        placemark.altitudeMode = WorldWind.RELATIVE_TO_GROUND;
        placemark.displayName = item.display_name;
        placemark.attributes = placemarkAttributes;
        resultsLayer.addRenderable(placemark);
      }

      // Initialize preview with the first item
      self.previewSelection(results[0]);
      // Display the preview dialog
      $('#previewDialog').modal();
      $('#previewDialog .modal-body-table').scrollTop(0);
    };
    this.previewSelection = function (selection) {
      let latitude = parseFloat(selection.lat),
        longitude = parseFloat(selection.lon),
        location = new WorldWind.Location(latitude, longitude);
      // Update our observable holding the selected location
      self.selected(location);
      // Go to the posiion
      self.previewGlobe.wwd.goTo(location);
    };
    this.gotoSelected = function () {
      // Go to the location held in the selected observable
      primaryGlobe.wwd.goTo(self.selected());
    };
  }

  // ---------------------
  // Construct our web app
  // ----------------------

  // Create the primary globe
  let globe = new Globe("globe-canvas");


  // Add layers ordered by drawing order: first to last
  // Add layers to the globe 
  // Add layers ordered by drawing order: first to last
  globe.addLayer(new WorldWind.BMNGLayer(), {
    category: "base"
  });
  // globe.addLayer(new WorldWind.BMNGLandsatLayer(), {
  //   category: "base",
  //   enabled: false
  // });
  globe.addLayer(new WorldWind.OpenStreetMapImageLayer(), {
    category: "base",
    enabled: false
  });
  globe.addLayer(new WorldWind.BingAerialLayer(), {
    category: "base",
    enabled: false
  });
  globe.addLayer(new WorldWind.BingAerialWithLabelsLayer(), {
    category: "base",
    enabled: false,
    detailControl: 1.5
  });
  globe.addLayer(new WorldWind.BingRoadsLayer(), {
    category: "base",
    enabled: false,
    detailControl: 1.5,
    opacity: 0.80
  });
  globe.addLayer(new WorldWind.RenderableLayer("📌 Markers"), {
    category: "setting",
    displayName: "📌 Markers",
    enabled: true
  });
  globe.addLayer(new WorldWind.CoordinatesDisplayLayer(globe.wwd), {
    category: "setting",
    displayName: "📍 Coordinates"
  });
  globe.addLayer(new WorldWind.ViewControlsLayer(globe.wwd), {
    category: "setting",
    displayName: "🕹 View Controls"
  });
  globe.addLayer(new WorldWind.CompassLayer(), {
    category: "setting",
    enabled: false,
    displayName: "🧭 Compass"
  });
  globe.addLayer(new WorldWind.StarFieldLayer(), {
    category: "setting",
    enabled: true,
    displayName: "💫 Stars"
  });
  globe.addLayer(new WorldWind.AtmosphereLayer(), {
    category: "setting",
    enabled: false,
    time: new Date(), // activates day/night mode
    displayName: "🧿 Atmosphere"
  });
  globe.addLayer(new WorldWind.ShowTessellationLayer(), {
    category: "debug",
    enabled: false,
    displayName: "🌐 Show Tessellation"
  });

  const AddFireLayer = (xmlDom) =>   {
    // Web Map Service information from NASA's Near Earth Observations WMS
    // const serviceAddress = "https://neo.sci.gsfc.nasa.gov/wms/wms?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0";
    // Named layer displaying Average Temperature data
    let layerName = "MOD14A1_M_FIRE";
  
    // Called asynchronously to parse and create the WMS layer
    // let createLayer = function (xmlDom) {
      // Create a WmsCapabilities object from the XML DOM
      let wms = new WorldWind.WmsCapabilities(xmlDom);
      // Retrieve a WmsLayerCapabilities object by the desired layer name
      let wmsLayerCapabilities = wms.getNamedLayer(layerName);
      // Form a configuration object from the WmsLayerCapability object
      let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
      // Modify the configuration objects title property to a more user friendly title
      wmsConfig.title = "🔥 Active Fires";
      // Create the WMS Layer from the configuration object
      let wmsLayer = new WorldWind.WmsLayer(wmsConfig);
  
      // Add the layers to WorldWind and update the layer manager
      globe.addLayer(wmsLayer, {
        category: "overlay",
        enabled: false,
      });
      // layerManager.synchronizeLayerList();
    // };
  
    // Called if an error occurs during WMS Capabilities document retrieval
    // let logError = function (jqXhr, text, exception) {
    //   console.log("There was a failure retrieving the capabilities document: " + text + " exception: " + exception);
    // };
  
    // ($.get(serviceAddress).done(createLayer).fail(logError))();
    // fetch('https://neo.sci.gsfc.nasa.gov/wms/wms?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0').then(res => createLayer(res)).catch(logError);
    // fetch(serviceAddress)
    //       .then(response => response.text())
    //       .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
    //       .then(data => createLayer(data))
    //       .catch(err => console.log(err))
  }

  const AddSeaSurfaceTemperatureLayer = (xmlDom) =>   {
    const layerName = "MYD28M";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "🌊 Sea Surface Temperature";
    wmsConfig.description = 'soy descrption';
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddSnowCoverLayer = (xmlDom) =>   {
    const layerName = "MOD10C1_M_SNOW";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "❄️ Snow Cover";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }
  
  const AddSolarInsolationLayer = (xmlDom) =>   {
    const layerName = "CERES_INSOL_M";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "☀️ Solar Insolation";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddTopographyLayer = (xmlDom) =>   {
    const layerName = "SRTM_RAMP2_TOPO";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "🏔 Topography";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddTrueColorLayer = (xmlDom) =>   {
    const layerName = "MOD_143D_RR";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "📸 True Color";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }
  const AddUvIndexLayer = (xmlDom) =>   {
    const layerName = "AURA_UVI_CLIM_M";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "✨ UV Index";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddAerosolOpticalThicknessLayer = (xmlDom) =>   {
    const layerName = "MODAL2_M_AER_OD";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "➰ Aerosol Optical Thickness";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddAerosolParticleRadiusLayer = (xmlDom) =>   {
    const layerName = "MODAL2_M_AER_RA";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "➿ Aerosol Particle Radius";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddAlbedoLayer = (xmlDom) =>   {
    const layerName = "MCD43C3_M_BSA";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "☄️ Albedo";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }
  const AddAverageLandSurfaceTemperatureNightLayer = (xmlDom) =>   {
    const layerName = "MOD_LSTN_CLIM_E";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "🌚 Average Land Surface Temperature Night";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddAverageLandSurfaceTemperatureDayLayer = (xmlDom) =>   {
    const layerName = "MOD_LSTD_CLIM_M";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "🌞 Average Land Surface Temperature Day";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddBathymetryLayer = (xmlDom) =>   {
    const layerName = "GEBCO_BATHY";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "💮 Bathymetry";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddCarbonMonoxideLayer = (xmlDom) =>   {
    const layerName = "MOP_CO_M";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "🔗 Carbon Monoxide";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddChlorophyllConcentrationLayer = (xmlDom) =>   {
    const layerName = "MY1DMM_CHLORA";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "⚗️ Chlorophyll Concentration";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddCloudFractionLayer = (xmlDom) =>   {
    const layerName = "MODAL2_M_CLD_FR";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "☁️ Cloud Fraction";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddCloudOpticalThicknessLayer = (xmlDom) =>   {
    const layerName = "MODAL2_M_CLD_OT";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "💨 Cloud Optical Thickness";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddCloudWaterContentLayer = (xmlDom) =>   {
    const layerName = "MODAL2_M_CLD_WP";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "💧 Cloud Water Content";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddFalseColorLayer = (xmlDom) =>   {
    const layerName = "MOD_721D_RR";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "🎆 False Color";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddGlobalTemperatureAnomalyLayer = (xmlDom) =>   {
    const layerName = "GISS_TA_M";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "🏜 Global Temperature Anomaly ";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddOzoneLayer = (xmlDom) =>   {
    const layerName = "AURA_OZONE_M";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "🌌 Ozone";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddPopulationLayer = (xmlDom) =>   {
    const layerName = "SEDAC_POP";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "👥 Population";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddNitrogenDioxideLayer = (xmlDom) =>   {
    const layerName = "AURA_NO2_E";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "♨️ Nitrogen Dioxide";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddLeafAreaIndexLayer = (xmlDom) =>   {
    const layerName = "MOD15A2_M_LAI";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "🏵 Leaf Area Index";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddNetPrimaryProductivityLayer = (xmlDom) =>   {
    const layerName = "MOD17A2_M_PSN";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "🎑 Net Primary Productivity";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddNetRadiationLayer = (xmlDom) =>   {
    const layerName = "CERES_NETFLUX_M";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "🎫 Net Radiation";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddOutgoingLongwaveRadiationLayer = (xmlDom) =>   {
    const layerName = "CERES_LWFLUX_M";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "♒️ Outgoing Longwave Radiation";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddPermafrostLayer = (xmlDom) =>   {
    const layerName = "PermafrostNSIDC";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "💠 Permafrost";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddRainfallLayer = (xmlDom) =>   {
    const layerName = "TRMM_3B43M";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "💦 Rainfall";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddReflectedShortwaveRadiationLayer = (xmlDom) =>   {
    const layerName = "CERES_SWFLUX_M";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "🌸 Reflected Shortwave Radiation";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddSeaIceConcentrationAndSnowExtentLayer = (xmlDom) =>   {
    const layerName = "NISE_D";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "⛄️ Sea Ice Concentration and Snow Extent, Global";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }

  const AddSeaSurfaceSalinityLayer = (xmlDom) =>   {
    const layerName = "AQUARIUS_SSS_M";
    // Create a WmsCapabilities object from the XML DOM
    let wms = new WorldWind.WmsCapabilities(xmlDom);
    // Retrieve a WmsLayerCapabilities object by the desired layer name
    let wmsLayerCapabilities = wms.getNamedLayer(layerName);
    // Form a configuration object from the WmsLayerCapability object
    let wmsConfig = WorldWind.WmsLayer.formLayerConfiguration(wmsLayerCapabilities);
    // Modify the configuration objects title property to a more user friendly title
    wmsConfig.title = "🔷 Sea Surface Salinity";
    // Create the WMS Layer from the configuration object
    let wmsLayer = new WorldWind.WmsLayer(wmsConfig);

    // Add the layers to WorldWind and update the layer manager
    globe.addLayer(wmsLayer, {
      category: "overlay",
      enabled: false,
    });
  }


  const serviceAddress = "https://neo.sci.gsfc.nasa.gov/wms/wms?SERVICE=WMS&REQUEST=GetCapabilities&VERSION=1.3.0";
  fetch(serviceAddress)
  .then(response => response.text())
  .then(str => (new window.DOMParser()).parseFromString(str, "text/xml"))
  .then(data => {
    AddUvIndexLayer(data)
    AddTrueColorLayer(data)
    AddTopographyLayer(data)
    AddSolarInsolationLayer(data)
    AddSnowCoverLayer(data)
    AddSeaSurfaceTemperatureLayer(data)
    AddSeaSurfaceSalinityLayer(data)
    AddSeaIceConcentrationAndSnowExtentLayer(data)
    AddReflectedShortwaveRadiationLayer(data)
    AddRainfallLayer(data)
    AddPopulationLayer(data)
    AddPermafrostLayer(data)
    AddOzoneLayer(data)
    AddOutgoingLongwaveRadiationLayer(data)
    AddNitrogenDioxideLayer(data)
    AddNetRadiationLayer(data)
    AddNetPrimaryProductivityLayer(data)
    AddLeafAreaIndexLayer(data)
    AddGlobalTemperatureAnomalyLayer(data)
    AddFireLayer(data)
    AddFalseColorLayer(data)
    AddCloudWaterContentLayer(data)
    AddCloudOpticalThicknessLayer(data)
    AddCloudFractionLayer(data)
    AddChlorophyllConcentrationLayer(data)
    AddCarbonMonoxideLayer(data)
    AddBathymetryLayer(data)
    AddAverageLandSurfaceTemperatureNightLayer(data)
    AddAverageLandSurfaceTemperatureDayLayer(data)
    AddAlbedoLayer(data)
    AddAerosolParticleRadiusLayer(data)
    AddAerosolOpticalThicknessLayer(data)
    // createLayer(data)
  })
  .catch(err => console.log(err))
// AddThermalLayer();
// AddFireLayer();


  // Activate the Knockout bindings between our view models and the html
  let layers = new LayersViewModel(globe);
  let settings = new SettingsViewModel(globe);
  let markers = new MarkersViewModel(globe);
  let tools = new ToolsViewModel(globe, markers);
  let preview = new PreviewViewModel(globe);
  let search = new SearchViewModel(globe, preview.previewResults);
  ko.applyBindings(layers, document.getElementById('layers'));
  ko.applyBindings(settings, document.getElementById('settings'));
  ko.applyBindings(markers, document.getElementById('markers'));
  ko.applyBindings(tools, document.getElementById('tools'));
  ko.applyBindings(search, document.getElementById('search'));
  ko.applyBindings(preview, document.getElementById('preview'));

  // Auto-collapse the main menu when its button items are clicked
  $('.navbar-collapse a[role="button"]').click(function () {
    $('.navbar-collapse').collapse('hide');
  });
  // Collapse card ancestors when the close icon is clicked
  $('.collapse .close').on('click', function () {
    $(this).closest('.collapse').collapse('hide');
  });


});

