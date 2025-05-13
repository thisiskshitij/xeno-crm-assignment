const ensureAuthenticated = (req, res, next) => {
  console.log("Auth Middleware: Checking authentication status for route...");
  if (req.isAuthenticated()) {
    console.log("Auth Middleware: User is authenticated.");

    return next();
  } else {
    console.warn("Auth Middleware: User is NOT authenticated. Sending 401.");

    res.status(401).json({ message: "Unauthorized: Please log in" });
  }
};

module.exports = { ensureAuthenticated };
