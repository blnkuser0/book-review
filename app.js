import express from "express";
import bodyParser from "body-parser";
import pg from "pg";
import dotenv from "dotenv";
import bcrypt from "bcrypt";
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import flash from "connect-flash";
import GoogleStrategy from "passport-google-oauth2";
import multer from "multer";
import path from "path";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const saltRounds = 10;
const callBackURL =
  process.env.CALLBACK_URL || "http://localhost:3000/auth/google/add";

const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

db.connect();

app.use(
  session({
    secret: process.env.SECRET_KEY,
    resave: false,
    saveUninitialized: true,
    cookie: {
      maxAge: 1000 * 60 * 60 //this cookie good for 1 hour only
    }
  })
);

app.use(flash());
app.use(passport.initialize());
app.use(passport.session());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));
app.set("view engine", "ejs");

// Multer configuration for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "public/uploads/");
  },
  filename: function (req, file, cb) {
    cb(
      null,
      Date.now() +
        "-" +
        Math.round(Math.random() * 1e9) +
        path.extname(file.originalname)
    );
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 1 * 1024 * 1024, // 1MB limit
  },
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|webp|svg/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(
      path.extname(file.originalname).toLowerCase()
    );

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(
        new Error(
          "Only image files (jpeg, jpg, png, gif, webp, svg) are allowed!"
        )
      );
    }
  },
});

async function totalBooks() {
  const result = await db.query("SELECT * FROM items WHERE is_private = false");
  return result.rows.length;
}

app.get("/", async (req, res) => {
  try {
    const result = await db.query(
      " SELECT * FROM items WHERE is_private = false ORDER BY id ASC"
    );
    res.render("index", {
      book: result.rows,
      total: await totalBooks(),
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    res.status(400).send("Error Fetching Books");
  }
});

app.get("/about", async (req, res) => {
  res.render("about", {
    total: await totalBooks(),
    user: req.user,
  });
});

app.get("/login", async (req, res) => {
  res.render("login", {
    message: req.flash("error"),
    total: await totalBooks(),
    user: req.user,
  });
});

app.get("/users/:id", async (req, res) => {
  const userId = req.params.id;

  try {
    const result = await db.query(
      "SELECT * FROM items WHERE user_id = $1 AND is_private = true",
      [userId]
    );
    res.render("users", {
      userReviews: result.rows,
      total: await totalBooks(),
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading user reviews");
  }
});

app.get("/logout", (req, res) => {
  req.logout((err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Error logging out");
    }
    res.redirect("/");
  });
});

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/add",
  passport.authenticate("google", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    res.redirect(`/users/${req.user.id}`);
  }
);

app.get("/signup", async (req, res) => {
  res.render("signup", { user: req.user });
});

app.post("/signup", async (req, res) => {
  const firstName = req.body.firstname;
  const lastName = req.body.lastname;
  const email = req.body.username;
  const password = req.body.password;

  try {
    const userCheck = await db.query(
      `SELECT * FROM users WHERE firstname = $1 AND lastname = $2 AND email = $3`,
      [firstName, lastName, email]
    );

    if (userCheck.rows.length > 0) {
      req.flash("error", "User already exists. Please log in.");
      return res.redirect("/login");
    } else {
      bcrypt.hash(password, saltRounds, async (err, hash) => { 
        const newUser = await db.query(
          `INSERT INTO users (firstname, lastname, email, password) VALUES ($1, $2, $3, $4) RETURNING id`,
          [firstName, lastName, email, hash]
        );
        res.redirect("/login");
      });
    }
  } catch (err) {
    console.error(err);
    res.status(500).send("Error signing up");
  }
});

app.post(
  "/login",
  passport.authenticate("local", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    res.redirect(`/users/${req.user.id}`);
  }
);

app.get("/add-review", async (req, res) => {
  // if (req.isAuthenticated()) {
  //   res.render("add", {
  //     total: await totalBooks(),
  //     user: req.user,
  //     source: req.query.source, // Pass the source parameter to the view
  //   });
  // } else {
  //   res.redirect("/login");
  // }

  res.render("add", {
    total: await totalBooks(),
    user: req.user,
    source: req.query.source, // Pass the source parameter to the view
  });
});

app.post("/add-review", upload.single("bookImage"), async (req, res) => {
  const title = req.body.title;
  const author = req.body.author;
  const review = req.body.review;
  const genre = req.body.genre;
  const rating = req.body.rating;
  const user_id = req.user.id;
  const source = req.body.source;

  try {
    const imagePath = req.file ? `/uploads/${req.file.filename}` : null;
    const isPrivate = source === "users" ? true : false;

    // Debug logging
    // console.log("Add review request:");
    // console.log("Source from form:", source);
    // console.log("isPrivate flag:", isPrivate);
    // console.log("User ID:", user_id);

    const result = await db.query(
      `INSERT INTO items 
        (author, genre, title, review, rating, image_path, user_id, is_private) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
      [author, genre, title, review, rating, imagePath, user_id, isPrivate]
    );

    const id = result.rows[0].id;
    const redirectUrl = source === "users" ? `/users/${req.user.id}` : "/";
    res.redirect(redirectUrl);
  } catch (err) {
    // console.log("Error adding review:", err);
    res.status(500).send("Error adding review");
  }
});

app.post("/edit", async (req, res) => {
  res.render("review", { book: req.body });
});

app.get("/reviews/:id", async (req, res) => {
  try {
    const bookId = req.params.id;
    const bookResult = await db.query("SELECT * FROM items WHERE id = $1", [
      bookId,
    ]);

    if (bookResult.rows.length === 0) {
      return res.status(404).send("Book not found");
    }

    const book = bookResult.rows[0];
    res.render("review", {
      book: book,
      review: book.review,
      user: req.user,
      currentUrl: req.originalUrl, // Pass current URL to template
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading review");
  }
});

app.get("/edit-review/:id", async (req, res) => {
  const bookId = req.params.id;

  try {
    const bookResult = await db.query("SELECT * FROM items WHERE id = $1", [
      bookId,
    ]);

    if (bookResult.rows.length === 0) {
      return res.status(404).send("Book not found");
    }

    const book = bookResult.rows[0];
    res.render("edit", { book: book });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading edit page");
  }
});

app.post("/update", async (req, res) => {
  const { updatedItemId, title, author, genre, review, rating } = req.body;

  try {
    await db.query(
      `UPDATE items SET title = $1, author = $2, genre = $3, review = $4, rating = $5 WHERE id = $6`,
      [title, author, genre, review, rating, updatedItemId]
    );
    res.redirect(`/reviews/${updatedItemId}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error updating review");
  }
});

// sa search bar ito
app.post("/search", async (req, res) => {
  const searchQuery = req.body.search.toLowerCase().trim();
  const displayQuery =
    searchQuery.charAt(0).toUpperCase() + searchQuery.slice(1);

  // console.log("Search value:", req.body.search);

  try {
    const result = await db.query(
      `SELECT * FROM items
      WHERE (LOWER(title) LIKE '%' || $1 || '%'
      OR LOWER(author) LIKE '%' || $1 || '%'
      OR LOWER(genre) LIKE '%' || $1 || '%')
      AND is_private = false`,
      [searchQuery]
    );
    res.render("search", {
      books: result.rows,
      total: await totalBooks(),
      totalResult: result.rows.length,
      searchTerm: displayQuery,
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error searching for books");
  }
});

app.post("/sort", async (req, res) => {
  const sortBy = req.body.sort;

  try {
    let query = "SELECT * FROM items WHERE is_private = false";
    if (sortBy === "Name (A-Z)") {
      query += " ORDER BY title ASC";
    } else if (sortBy === "Rating ★") {
      query += " ORDER BY rating DESC";
    }

    const result = await db.query(query);
    res.render("sort", {
      book: result.rows,
      total: await totalBooks(),
      totalResult: result.rows.length,
      sortBy: sortBy,
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error sorting books");
  }
});

app.post("/genre", async (req, res) => {
  const genre = req.body.genre;
  const genreTag = req.body.genreTag;

  let genreInput = "";

  if (genreTag && !genre) {
    genreInput = genreTag;
  } else if (genre && !genreTag) {
    genreInput = genre;
  }

  // console.log("Genre input:", genreInput);

  try {
    const result = await db.query(
      `SELECT * FROM items WHERE LOWER(genre) = LOWER($1) AND is_private = false`,
      [genreInput.toLocaleLowerCase()]
    );
    res.render("genre", {
      book: result.rows,
      total: await totalBooks(),
      totalResult: result.rows.length,
      genre: genreInput,
      user: req.user,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error filtering by genre");
  }
});

app.post("/delete-review", async (req, res) => {
  const bookId = req.body.id;
  let referrer = req.body.referrer || "/"; // Get the referrer or default to homepage

  try {
    await db.query("DELETE FROM items WHERE id = $1", [bookId]);

    // If deleting from a review page, redirect to homepage instead of the non-existent review
    if (referrer.startsWith("/reviews/")) {
      referrer = "/";
    }

    res.redirect(referrer);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error deleting review");
  }
});

passport.use(
  "google",
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: callBackURL,
      userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo",
    },
    async (accessToken, refreshToken, profile, cb) => {
      try {
        const result = await db.query("SELECT * FROM users WHERE email = $1", [
          profile.email,
        ]);
        if (result.rows.length === 0) {
          const user = await db.query(
            `INSERT INTO users (firstname, lastname, email, password, photo)
                VALUES ($1, $2, $3, $4, $5) RETURNING *`,
            [
              profile._json.given_name,
              profile._json.family_name,
              profile.email,
              "google-auth",
              profile._json.picture,
            ]
          );
          const userData = user.rows[0];
          return cb(null, userData);
        } else {
          return cb(null, result.rows[0]);
        }
      } catch (err) {
        console.log(err);
      }
    }
  )
);

passport.use(
  "local",
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query(
        `SELECT * FROM users WHERE email = $1 `,
        [username]
      );

      if (result.rows.length > 0) {
        const user = result.rows[0];
        const isValidPassword = user.password;

        bcrypt.compare(password, isValidPassword, (err, isMatch) => {
          if (err) {
            return cb(err);
          } else {
            if (isMatch) {
              return cb(null, user);
            } else {
              return cb(null, false, {
                message: "Wrong password, please try again.",
              });
            }
          }
        });
      } else {
        return cb(null, false, {
          message: "User not found",
        });
      }
    } catch (err) {
      return cb(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server is running on port http://localhost:${port}`);
});
