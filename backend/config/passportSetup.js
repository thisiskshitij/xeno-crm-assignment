const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.serializeUser((user, done) => {
  console.log("Passport: Serializing user:", user.id);
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  console.log("Passport: Deserializing user:", id);
  try {
    const user = await User.findById(id);
    if (!user) {
      console.warn(
        "Passport: User not found during deserialization for ID:",
        id
      );
      return done(null, false);
    }
    console.log("Passport: User deserialized successfully:", user.name);
    done(null, user);
  } catch (err) {
    console.error("Passport: Error during deserialization for ID:", id, err);
    done(err, null);
  }
});

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,

      callbackURL: "/auth/google/callback",
    },

    async (accessToken, refreshToken, profile, done) => {
      console.log("Passport: Google OAuth Verify Callback triggered.");
      console.log("Google Profile ID:", profile.id);
      console.log("Google Profile Name:", profile.displayName);
      console.log(
        "Google Profile Email:",
        profile.emails ? profile.emails[0].value : "N/A"
      );

      try {
        const existingUser = await User.findOne({ googleId: profile.id });

        if (existingUser) {
          console.log("Passport: Existing user found:", existingUser.name);

          done(null, existingUser);
        } else {
          console.log("Passport: Creating new user...");

          const newUser = new User({
            googleId: profile.id,
            name: profile.displayName,
            email: profile.emails
              ? profile.emails[0].value
              : "no-email@example.com",
          });
          const savedUser = await newUser.save();
          console.log("Passport: New user created:", savedUser.name);

          done(null, savedUser);
        }
      } catch (err) {
        console.error("Passport: Error in Google OAuth verify callback:", err);
        done(err, null);
      }
    }
  )
);
