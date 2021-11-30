function error(message) {
  var date = new Date();
  date.toLocaleString();
  console.error(`[${date}]`, message);
}

module.exports = {
  error,
};
