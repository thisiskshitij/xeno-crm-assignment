const router = require("express").Router();
const passport = require("passport");

router.get(
  "/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

router.get(
  "/google/callback",
  passport.authenticate("google", {
    failureRedirect: "/auth/login/failed",
  }),

  (req, res) => {
    console.log("Authentication successful! User:", req.user.name);

    res.redirect(process.env.FRONTEND_URL);
  }
);

router.get("/login/failed", (req, res) => {
  console.log("Authentication failed.");
  res.status(401).send("Authentication Failed");
});

router.get("/check", (req, res) => {
  console.log(
    "Checking authentication status. req.isAuthenticated:",
    req.isAuthenticated()
  );
  if (req.isAuthenticated()) {
    res.status(200).json({
      isAuthenticated: true,
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email,
      },
    });
  } else {
    res.status(200).json({ isAuthenticated: false, user: null });
  }
});

router.get("/logout", (req, res, next) => {
  console.log("Attempting logout.");
  req.logout((err) => {
    if (err) {
      console.error("Error during logout:", err);
      return next(err);
    }

    console.log("User logged out successfully.");

    res.redirect("/");
  });
});

module.exports = router;
