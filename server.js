//#

const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const User = require("./models/userModel"); //when importing a model use a capital
const Blogpost = require("./models/blogPosts");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const cookieParser = require("cookie-parser");
const auth = require("./middlewares/auth");
const hbs = require("hbs");
const { Console } = require("console");

const app = express();
dotenv.config({ path: "./.env" }); // holds sensitive information
mongoose
  .connect(process.env.DB_URL, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB is connected")); // PROCESS IS A key word to acess the .env.db_url for our project
app.use(express.urlencoded({ extended: false }));
app.use(express.json({ extended: false }));
app.use(cookieParser());

const viewsPath = path.join(__dirname, "/views");
app.set("view engine", "hbs");
app.set("views", viewsPath);
const partialPath = path.join(__dirname, "/views/inc");
hbs.registerPartials(partialPath);
const publicDirectory = path.join(__dirname, "/public");
app.use(express.static(publicDirectory));

//<----------------------HOME PAGE ---------------------------->

app.get("/", (req, res) => {
  res.render("index");
});

app.post("/index", async (req, res) => {
  console.log(req.body);
  const hashedPassword = await bcrypt.hash(req.body.userPassword, 8);
  const user = await User.find({ email: req.body.userEmail });
  const password1 = req.body.userPassword;
  const password2 = req.body.confirmPassword;
  if (password1 !== password2) {
    res.send("pass dont match");
  } else if (user.length > 0) {
    res.send("email in use");
  } else {
    await User.create({
      name: req.body.userName,
      email: req.body.userEmail,
      password: hashedPassword,
    });
    res.redirect("/login");
  }
});

//  USER SECTION
//<------------------- User Profile -------------------------------> @@@@@@
app.get("/profile", auth.isLoggedIn, async (req, res) => {
  console.log("GOT name from auth ");
  // console.log(req.userFound.name);
  if (req.userFound && req.userFound.admin) {
    res.redirect("/adminPage");
  } else if (req.userFound) {
    const userDB = req.userFound; //  = const userDB = await User.findById(req.params.id)
    console.log(userDB);
    res.render("profile", {
      user: userDB,
    });
  } else {
    res.redirect("login");
  }
});

//<--------------- USER ENABLED DELETE ---------------------->

app.post("/delete", auth.isLoggedIn, async (req, res) => {
  await User.findByIdAndDelete(req.userFound._id);

  res.send("User Deleted");
});

//<--------------- UPDATE USER DETAILS ------------->
app.get("/update", auth.isLoggedIn, (req, res) => {
  const userDB = req.userFound;
  res.render("userUpdate", {
    user: userDB,
  });
});

app.post("/update", auth.isLoggedIn, async (req, res) => {
  const userId = req.userFound._id;
  const id = await User.findById(userId);

  const isMatch = await bcrypt.compare(req.body.updatePassword, id.password);
 
  const hashedPassword = await bcrypt.hash(req.body.confirmPassword, 8);

  if (isMatch) {
    await User.findByIdAndUpdate(userId, {
    name: req.body.userName,
    email: req.body.userEmail,
    password: hashedPassword,
  });
  res.redirect("/profile")
  } else {
    res.send("error with password match");
   
  };
});

//<----------------- NEW BLOG POST ---------------------->
app.get("/blogpost", auth.isLoggedIn, (req, res) => {
  if(req.userFound){ 
  }
  res.render("newPost");
});

app.post("/blogpost", auth.isLoggedIn, async (req, res) => {
if(req.userFound){
  await Blogpost.create({
    title: req.body.postTitle,
    body: req.body.postBody,
    user: req.userFound.id,
  });
} res.render("/profile");
});
//<----------------------- ALL THIS USERS POSTS ----------------------------->
app.get("/allposts", auth.isLoggedIn, async (req, res) => {
  const allposts = await Blogpost.find({ user: req.userFound._id }).populate("user","name");
  let firstObject = allposts[0];
  res.render("allposts", {
    firstObject: firstObject,
    allposts: allposts,
  });
});

//<------------------ EDIT POSTS BY USER -------------------------------->
app.get("/userPostUpdate", auth.isLoggedIn, async (req, res) => {
  const thisPost = await Blogpost.find({ user: req.userFound._id });
  res.render("userPostUpdate", {
    thisPost: thisPost,
  });
});
app.post("/userPostUpdate/:id", auth.isLoggedIn, async (req, res) => {
 
  if(req.userFound) {
    await Blogpost.findByIdAndUpdate(req.params.id, {
      title: req.body.blogTitle,
      body: req.body.blogBody,
      user: req.userFound.id,
    });
  }
  res.send("Post updated")
  
})
//<------------------- DELETE BLOG ------------------------------------------->


app.get("/deleteBlog/:id", auth.isLoggedIn, async (req, res) => {
  console.log(req.params.id)
  if(req.userFound._id)
  await Blogpost.findByIdAndDelete(req.params.id);

  res.redirect("/profile");
});


//ADMIN SECTION
//<------------------------- ADMIN PAGE ---------------------------------->
app.get("/adminPage", auth.isLoggedIn, (req, res) => {
  if (req.userFound && req.userFound.admin) {
    res.render("adminPage");
  } else {
    res.send("Please return to the home page");
  }
});
//<------------ADMIN VIEW ALL USERS-------------->
app.get("/allUser", auth.isLoggedIn, async (req, res) => {
  if (req.userFound.admin) {
    const usersDB = await User.find();
    console.log(usersDB);
    res.render("dbUser", {
      users: usersDB,
    });
  }
});

//<--------------- ADMIN DELETE A USER -------------------------->
app.post("/delete/:id", auth.isLoggedIn, async (req, res) => {
  if (req.userFound.admin) {
    await User.findOneAndDelete(req.params.id);
  }
  res.render("userDeleted");
});

//<--------------- ADMIN UPDATE A USER -------------------------->
app.get("/adminUserUpdate/:id", auth.isLoggedIn, async (req, res) => {
  if (req.userFound.admin) {
  }
  res.render("thisUser");
});



//LOGIN & LOGOUT SECTIONS
//<--------------------------Login ----------------------------------------------->>
// produces the cookie which is used for accessibily to the site
app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.userEmail });
  console.log("data below coming from login")
  console.log(user)
  const isMatch = await bcrypt.compare(req.body.userPassword, user.password);
  if (isMatch) {
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_SECRET_IN,
    });
    console.log(token);
    const cookieOption = {
      expires: new Date(
        Date.now() + process.env.JWT_COOKIE_EXPIRES * 24 * 60 * 60 * 1000
      ),
      httpOnly: true,
    };
    res.cookie("jwt", token, cookieOption);
    res.redirect("/profile");
  } else {
    res.send("Login Detail Incorrect");
  }
});

//<-------------Log OUT---------------------------------->

app.get("/logout", auth.logout, (req, res) => {
  // res.send("You are logged out");
  res.render("logBackIn");
});

// ROUTE NOT FOUND & PORT SECTION
// <--------- ROUTE NOT FOUND ----------------------------->
app.get("/*", (req, res) => {
  res.send("404 error page doesn't exist, please return to the home page");
});

//<--------- THE PORT THE SERVER IS RUNNING ON------------->
app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
