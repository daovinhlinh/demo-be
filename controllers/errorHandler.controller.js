const err404 = (req, res, next) => {
  const error = new Error("Not Found");
  error.status(404);
  next(error);
};

const err505 = (error, req, res) => {
  res.status(error.status || 500);
  res.json({
    error: {
      status: error.status || 500,
      message: error.message,
    },
  });
};

export default { err404, err505 };
