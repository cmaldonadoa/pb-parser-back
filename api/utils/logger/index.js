function error(message) {
  var date = new Date();
  date.toLocaleString();
  console.error(`[${date}]`, message);
}

async function tcWrapper(fn, res) {
  try {
    await fn();
  } catch (error) {
    error(error);
    res.status(500).json({ status: 500, error });
  }
}

module.exports = {
  error,
  tcWrapper,
};
