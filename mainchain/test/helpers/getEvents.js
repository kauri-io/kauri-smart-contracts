var getEvents = (filter) => {
  return new Promise((resolve, reject) => {
      filter
      .then(function(logs) {
          resolve(logs);
      })
      //.on('error', reject("Error subscribing to logs"))
  });
}

Object.assign(exports, {
  getEvents
});
