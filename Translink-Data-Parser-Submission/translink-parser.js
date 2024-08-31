import fs_promise from "fs/promises";
import fetch from "node-fetch";
import fs from "fs";
import path from "path";
import promptSync from "prompt-sync";
import { parse } from "csv-parse/sync";
const prompt = promptSync({ sigint: true });



// Function to flush cache by deleting cached JSON files
/**
 * Asynchronously removes all JSON files from the specified folder.
 * @async
 * @function removeCache
 * @throws {Error} If an error occurs while reading or deleting files.
 */
async function removeCache() {
  try {
    const cacheFolderPath = "cached-data";
    const files = await fs_promise.readdir(cacheFolderPath);

    for (const file of files) {
      if (file.endsWith(".json")) {
        const filePath = path.join(cacheFolderPath, file);
        await fs_promise.unlink(filePath); // Delete the file
        console.log(`Flushed cache file: ${file}`);
      }
    }
  } catch (error) {
    console.error("Error flushing cache:", error);
  }
}




async function main() 
{


// Function to fetch live data
  /**
 * Asynchronously fetches JSON data 
 * @async
 * @function fetchLiveData
 * @param {string} url - The URL to fetch JSON data from.
 * @returns {Promise<Object>} Parsed JSON data from the response.
 */
  async function fetchLiveData(url) {
    let response = await fetch(url);
    let JSONResponse = await response.json();
    return JSONResponse;
  }
  const parseCSV = (file) => {
    const data = fs.readFileSync(file, "utf8");
    return parse(data, {
      columns: true,
    });
  };



  /**
   * This function will read a JSON cache file with the specified filename.
   * @param {string} filenameAppend 
   * @returns {string} the json  data from cache file.
   */
  async function readCache(filenameAppend) {
    try {
      const data = await fs.readFile(jsonFilename(filenameAppend));
      console.log(messageReadCache(filenameAppend));
      return data;
    } catch (error) {
      console.log(error);
    }
  }



  /**
   * This function will save a JSON cache file with the specified filename & data.
   * @param {string} filenameAppend - The string to append to the JSON filename.
   * @param {string} data - The string containing JSON data to save.
   */
  async function saveCache(filenameAppend, data) {
    try {
      await fs_promise.writeFile(filenameAppend, JSON.stringify(data));
    } catch (error) {
      console.log(error);
    }
  }



  // Function to get live data
  /**
 * Asynchronously fetches live data from different links and saves the data as cache.
 * @async
 * @function getlivedata
 * @throws {Error} If an error occurs while fetching data.
 */
  async function getlivedata() {
    const vehiclePositions = await fetchLiveData(
      "http://127.0.0.1:5343/gtfs/seq/vehicle_positions.json"
    );
    const tripupdates = await fetchLiveData(
      "http://127.0.0.1:5343/gtfs/seq/trip_updates.json"
    );
    await saveCache("cached-data/vehiclePositions.json", vehiclePositions);
    await saveCache("cached-data/tripupdates.json", tripupdates);
  }



  // Function to extract live arrival time and location data 
  /**
 * Asynchronously processes cached vehicle position data to extract live arrival times and locations.
 * @async
 * @function LiveArrivalTimeAndLocation
 * @throws {Error} If an error occurs while reading or processing data.
 * @returns {Promise<Array<Object>|null>} An array of objects containing live arrival times and locations, or null if no data is available.
 */
  async function LiveArrivalTimeAndLocation() {
    try {
      const vehiclePositionData = await fs_promise.readFile(
        "cached-data/vehiclePositions.json",
        "utf8"
      );
      const vehiclePositionJson = JSON.parse(vehiclePositionData);
  
      const liveData = vehiclePositionJson.entity
        .filter((entity) => entity.vehicle)
        .map((entity, index) => {
          if (!entity.vehicle) {
            console.log(`Entity at index ${index} has no vehicle data`);
            return null;
          }
          return {
            liveArrivalTime: entity.vehicle.timestamp,
            liveLocation: {
              latitude: entity.vehicle.position.latitude,
              longitude: entity.vehicle.position.longitude,
            },
          };
        })
        .filter((data) => data !== null);
  
      if (liveData.length > 0) {
        return liveData;
      } else {
        console.error("No live data found in vehicle position data.");
        return null;
      }
    } catch (error) {
      console.error("Error reading vehicle position data:", error);
      return null;
    }
  }
  
  


 /**
 * Prompts the user to decide whether to run the main function again or exit the program.
 * If an invalid input is provided, the function displays an error message and prompts again.
 * @function askToRunAgain
 */
  function askToRunAgain() {
    const runAgain = prompt("Would you like to search again?:").toLowerCase();
    if (runAgain == "yes" || runAgain == "y") {
      main(); // Call the main function again
    } else if (runAgain == "no" || runAgain == "n") {
      console.log("Thanks for using the UQ Lakes station bus tracker!");
      process.exit(0);
    } else {
      console.log("Error message for incorrect expected value:");
      console.log("Please enter a valid option.");
      askToRunAgain();
    }
  }




  // Function to join two arrays based on a field and merge specific fields
  /**
 * Joins two arrays based on a specified field and merges selected fields from the second array into the first array's objects.
 * @function join
 * @param {Array<Object>} array1 - The array to be joined and merged.
 * @param {Array<Object>} array2 - Also second array to be joined and merged.
 * @param {string} joinOnField - The field name used for joining the arrays.
 * @returns {Array<Object>} An array of objects resulting from the join and merge operation.
 */
  function join(array1, array2, joinOnField, fieldsToMerge) {
    return array1
      .map((item1) => {
        const item2 = array2.find(
          (item2) => item1[joinOnField] === item2[joinOnField]
        );

        if (item2) {
          const merged = {};
          for (const field of fieldsToMerge) {
            if (item2.hasOwnProperty(field)) {
              merged[field] = item2[field];
            }
          }
          return {
            ...item1,
            ...merged,
          };
        }
        return null;
      })
      .filter((item) => item != null);
  }



//user inputs the date
  /**
 * Prompts the user to input a valid departure date in YYYY-MM-DD format and returns a Date object.
 * Repeats the prompt until a valid date is provided by the user.
 * @function selectedDate
 * @returns {Date} A Date object representing the selected departure date.
 */
  function selectedDate() {
    let isDate = false;
    let validDate = null;

    while (!isDate) {
      const datee = prompt(
        "What date will you depart UQ Lakes station by bus?"
      );
      const parts = datee.split("-");

      if (parts.length !== 3) {
        console.log("Incorrect date format. Please use YYYY-MM-DD.");
      } else {
        const year = parseInt(parts[0]);
        const month = parseInt(parts[1]);
        const day = parseInt(parts[2]);

        if (isNaN(year) || isNaN(month) || isNaN(day)) {
          console.log("Incorrect date format. Please use YYYY-MM-D.");
        } else if (
          year < 1700 ||
          year > 2099 ||
          month < 1 ||
          month > 12 ||
          day < 1 ||
          day > 30
        ) {
          console.log("Incorrect date format. Please use YYYY-MM-DD");
        } else {
          isDate = true;
          validDate = new Date(year, month - 1, day); // Creating a Date object
        }
      }
    }

    return validDate;
  }



  //user inputs the time
  /**
 * Prompts the user to input a valid departure time in HH:mm format and returns the time.
 * If an incorrect format is provided, it displays an error and prompts again.
 * @function selectedTime
 * @returns {string} A string representing the selected departure time in HH:mm format.
 */
  function selectedTime() {
    const time = prompt("What time will you depart UQ Lakes station by bus?");
    const regex = /^\d{2}:\d{2}$/;
    if (!regex.test(time)) {
      console.log("Incorrect time format. Please use HH:mm");
      return selectedTime(); // Return the result of the recursive call
    } else {
      return time; // Return the valid time
    }
  }



  //user inputs the route
  /**
 * Prompts the user to input a valid bus route number and returns the corresponding route name.
 * If an invalid route number is provided, it displays an error and prompts again.
 * @function selectedRoute
 * @returns {string} The name of the selected bus route.
 */
  function selectedRoute() {
    const route = prompt("What Bus Route would you like to take?");
    const regex = /^\d{1}$/;

    if (!regex.test(route)) {
      console.log("Please enter a valid option for a bus route");
      return selectedRoute(); // Recursive call for invalid input
    } else {
      const selectedSno = parseInt(route);
      const selectedRouteObj = availableroutes.find(
        (routeObj) => routeObj.sno === selectedSno.toString()
      );

      if (selectedRouteObj) {
        return selectedRouteObj.busroute;
      } else {
        console.log("Invalid bus route option");
        return selectedRoute(); // Recursive call for invalid route
      }
    }
  }



  // Function to filter data based on selected route
  /**
 * Filters a data pool of bus routes based on the user's selected route.
 * If "Show All Routes" is selected, all routes are returned.
 * Otherwise, only the routes matching the user's selected route are returned.
 * @function FilteredRoute
 * @param {Array<Object>} data_pool - The data pool containing bus route information.
 * @param {string} userRoute - The user-selected bus route or "Show All Routes".
 * @returns {Array<Object>} An array of bus route objects matching the user's selection.
 */
  function FilteredRoute(data_pool, userRoute) {
    if (userRoute == "Show All Routes") {
      return data_pool.filter((item) => item.route_short_name);
    } else {
      return data_pool.filter((item) => item.route_short_name === userRoute);
    }
  }



  // Function to combine live data with final data
  /**
 * Combines live arrival time and location data with final data based on corresponding indices.
 * @function combineLiveData
 * @param {Array<Object>} liveData - An array of objects containing live arrival time and location data.
 * @param {Array<Object>} finalData - An array of objects representing final data.
 * @returns {Array<Object>} An array of objects with combined live and final data, or an empty array in case of errors or no data.
 */
  function combineLiveData(liveData, finalData) {
    if (!Array.isArray(liveData) || !Array.isArray(finalData)) {
      console.error("Invalid input data.");
      return [];
    }

    const combinedData = finalData.reduce((result, finalItem, index) => {
      const liveItem = liveData[index];

      if (liveItem) {
        const combinedItem = {
          ...finalItem,
          liveArrivalTime: liveItem.liveArrivalTime,
          liveLocation: liveItem.liveLocation,
        };
        result.push(combinedItem);
      }

      return result;
    }, []);

    if (combinedData.length > 0) {
      return combinedData;
    } else {
      console.error("No combined data available.");
      return [];
    }
  }



  //Welcome Statement
  console.log("Welcome to the UQ Lakes station bus tracker!");



  // Asynchronously parses static data files and assigns the parsed data to corresponding variables.
// Uses Promise.all to ensure concurrent parsing of multiple files.
  const [routes, trips, calendar, stop_times, stops] = await Promise.all([
    parseCSV("static-data/routes.txt"),
    parseCSV("static-data/trips.txt"),
    parseCSV("static-data/calendar.txt"),
    parseCSV("static-data/stop_times.txt"),
    parseCSV("static-data/stops.txt"),
  ]);



 /**
 * An array of available bus routes with their corresponding serial numbers.
 * Used for presenting user-selectable route options.
 * @type {Array<Object>}
 */
  const availableroutes = [
    {
      sno: "1",
      busroute: "Show All Routes",
    },
    {
      sno: "2",
      busroute: "66",
    },
    {
      sno: "3",
      busroute: "192",
    },
    {
      sno: "4",
      busroute: "169",
    },
    {
      sno: "5",
      busroute: "209",
    },
    {
      sno: "6",
      busroute: "29",
    },
    {
      sno: "7",
      busroute: "P332",
    },
    {
      sno: "8",
      busroute: "139",
    },
    {
      sno: "9",
      busroute: "28",
    },
  ];




 /**
 * Array containing column names included for routes and trips.
 * @type {string[]}
 */
  const clmns_included_for_routes_and_trips = [
    "route_short_name",
    "route_long_name",
    "route_type",

  ];


  /**
 * Array of column names included for calendar and trips.
 * @type {string[]}
 */
  const clmns_included_for_calendar_and_trips = [
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
    "sunday",
    "start_date",
    "end_date",
  ];


  /**
 * An array containing the column names included for stop times and stops data.
 * @type {string[]}
 */
  const clmns_included_for_stopTimes_and_stops = [
    "arrival_time",
    "departure_time",
  ];
  const stopIds = ["1878", "1853", "1947", "1882"];


  //Function are being called and debugging
  const validDate = selectedDate();
  const storedTime = selectedTime();
  const formattedRoutes = availableroutes.map(
    (route) => `${route.sno} : ${route.busroute}`
  );
  console.log(formattedRoutes.join("\n"));
  const route = selectedRoute();
  const storedRoute = FilteredRoute(routes, route.busroute);


  /**
 * Joins two data arrays based on a common key and includes specified columns from both arrays.
 *
 * @param {Array} data1 - The first data array to be joined.
 * @param {Array} data2 - The second data array to be joined.
 * @param {string} key - The common key to perform the join operation on.
 * @param {Array} columns - An array of column names to include in the result.
 * @returns {Array} - An array containing the joined data with selected columns.
 */
  let joined_data = join(
    trips,
    routes,
    "route_id",
    clmns_included_for_routes_and_trips
  );


  /**
 * Joins the data from two datasets using a specified column as the key.
 *
 * @param {Object[]} sourceData - The source dataset to which the data will be joined.
 * @param {Object[]} newData - The new dataset that will be joined to the source dataset.
 * @param {string} joinColumn - The column in both datasets used as the key for the join operation.
 * @param {string[]} columnsIncluded - An array of column names to be included in the joined result.
 * @returns {Object[]} - A new dataset resulting from joining `sourceData` and `newData` based on the `joinColumn`.
 */
joined_data = join(
    joined_data,
    calendar,
    "service_id",
    clmns_included_for_calendar_and_trips
  );


  /**
 * Filters an array of stop times to include only those with stop IDs present in the given array.
 *
 * @param {Array} stop_times - An array of stop time objects.
 * @param {Array} stopIds - An array of stop IDs to filter by.
 * @returns {Array} - An array containing stop time objects with stop IDs that match the ones in the stopIds array.
 */
  let uq_stop_times = stop_times.filter((service) =>
    stopIds.includes(service.stop_id)
  );

/**
 * Generates a formatted string representation of a valid date.
 *
 * @param {Date} validDate - The valid date to be formatted.
 * @returns {string} The formatted date string in the format "YYYYMMDD".
 */
  const validDataAsString = `${validDate.getFullYear()}${(
    validDate.getMonth() + 1
  )
    .toString()
    .padStart(2, "0")}${validDate.getDate().toString().padStart(2, "0")}`;



/**
 * Combines joined trip data with stop times data based on trip IDs and filters by date range.
 * @param {Array} joinedData - An array containing joined trip data and route information.
 * @param {Array} stopTimesData - An array containing stop times data for specific trips.
 * @param {string} joinOnField - The field used to join the data arrays (e.g., "trip_id").
 * @param {Array} fieldsToMerge - An array of field names to be included in the merged data.
 * @param {string} validDataAsString - A string representing the valid date in YYYYMMDD format.
 * @returns {Array} - An array containing the unified and filtered data.
 */
  let unified_data = join(
    joined_data,
    uq_stop_times,
    "trip_id",
    clmns_included_for_stopTimes_and_stops
  ).filter(
    (service) =>
      parseInt(service.start_date, 10) <= parseInt(validDataAsString, 10) &&
      parseInt(validDataAsString, 10) <= parseInt(service.end_date, 10)
  );



  // Split the time string by the colon and map each part to a number
  /**
 * Converts a time string in the format "hh:mm" to minutes.
 *
 * @param {string} timeStr - The time string in the format "hh:mm".
 * @returns {number} The equivalent time in minutes.
 */
  const timeToMinutes = (timeStr) => {
    const parts = timeStr.split(":").map(Number);
    const [hours, minutes] = parts;
    return hours * 60 + minutes;
  };



  // Filtering data based on time and day of the week
  /**
 * Filters an array of unified data based on the time difference between stored time and arrival time,
 * and the day of the week.
 *
 * @param {Object[]} unified_data - An array of objects containing unified data.
 * @param {string} storedTime - The stored time in HH:MM format.
 * @returns {Object[]} - An array of filtered data objects.
 * @param {string} timeString - The time string in HH:MM format.
* @returns {number} - The time in minutes.
  */



  let timeFiltered = unified_data.filter((item) => {
    const enteredMins = timeToMinutes(storedTime);
    const serviceTime = timeToMinutes(item.arrival_time);


    // Time difference calculation in minutes
    const timeDifference = serviceTime - enteredMins;

    // Check if the time difference is within 10 minutes

    return timeDifference >= 0 && timeDifference <= 10;
  });

  const daysOfWeek = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  const selectedDay = daysOfWeek[validDate.getDay()].toLowerCase();


  /**
 * Filters an array of service objects based on a selected day.
 *
 * @param {Array<Object>} services - An array of service objects to be filtered.
 * @param {string} selectedDay - The selected day to filter the services by.
 * @returns {Array<Object>} - An array of filtered service objects for the selected day.
 */
  const filteredByDay = timeFiltered.filter(
    (service) => service[selectedDay] === "1"
  );

  const temp = FilteredRoute(filteredByDay, route);



/**
 * Retrieves live data asynchronously.
 * @async
 * @function
 * @returns {Promise<void>} A Promise that resolves once the live data has been fetched.
 */
  await getlivedata();



  /**
 * Transforms an array of objects by selecting specific properties and renaming them.
 * @param {Array<Object>} temp - The input array of objects to be transformed.
 * @return {Array<Object>} - An array of objects with selected and renamed properties.
 * @property {string}
 */
  const FinalData = temp.map((item) => ({
    "Route id": item.route_id,
    "Service id": item.service_id,
    "Trip id": item.trip_id,
    "Trip headsign": item.trip_headsign,
    "Route short name": item.route_short_name,
    "Route long name": item.route_long_name,
    "Arrival time": item.arrival_time,
  }));



  /**
 * Asynchronous function that fetches live arrival time and location data.
 * @typedef {Object} LiveArrivalData
 * @property {string} arrivalTime - The estimated arrival time of the live data.
 * @property {string} location - The location information of the live data.
 * @returns {Promise<LiveArrivalData>} A Promise resolving to the live arrival time and location data.
 */
  const liveData = await LiveArrivalTimeAndLocation();
  const finalDataWithLiveData = combineLiveData(liveData, FinalData);
  console.table(finalDataWithLiveData);
  askToRunAgain();
}



/**
 * Clears cache at regular intervals.
 * @function
 * @name removeCache
 * @returns {void}
 */
setInterval(removeCache, 5 * 60 * 1000);



// Call the main function to start the program
main();

