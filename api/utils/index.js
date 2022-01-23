function handleError(message) {
  const date = new Date();
  const d = date.toLocaleString();

  var error = message.stderr ? message.stderr : message;
  error = error instanceof Buffer ? error.toString() : error;

  console.error(`[${d}]`, error);
}

async function tcWrapper(fn, res) {
  try {
    await fn();
  } catch (e) {
    var error = e.stderr ? e.stderr : e;
    error = error instanceof Buffer ? error.toString() : error;
    handleError(error);
    res.status(500).json({ status: 500, error });
  }
}

module.exports = {
  handleError,
  tcWrapper,
};
