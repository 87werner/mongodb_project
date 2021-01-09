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
  console.log(req.userFound.name);
  const userDB = req.userFound; //  = const userDB = await User.findById(req.params.id)
  console.log(userDB);
  res.render("profile", {
    user: userDB,
  });
  if (req.userFound.admin == true) {
 
    res.redirect("/adminPage");
    //   }else{
    //      res.redirect("profile")
    //   }
  }
});

//<--------------- USER ENABLED DELETE ---------------------->

app.post("/delete/", auth.isLoggedIn,async (req, res) => {


  await User.findByIdAndDelete(req.userFound._id);

  res.send("User Deleted");
});

//<--------------- UPDATE USER DETAILS ------------->
app.get("/update", auth.isLoggedIn, (req,res) =>{
  const userDB = req.userFound;
   res.render("userUpdate",{
     user: userDB 
   })
})
app.post("/update", auth.isLoggedIn, async (req, res) => {
  console.log(req.userFound)
  let name = req.body.userName;
  console.log(req.body.userName)
  let email = req.body.userEmail;
  const hashedPassword = await bcrypt.hash(req.body.userPassword, 8);
  await User.findByIdAndUpdate(req.userFound._id),{
    name: name,
    email: email,
    password: hashedPassword
  }

  res.send("updated user")
})


//<----------------- NEW BLOG POST ---------------------->
app.get("/blogpost", auth.isLoggedIn, (req, res) => {
  console.log("ID found whe you click on link to post a blog")
  console.log(req.userFound._id);
  console.log(req.userFound.name);
  res.render("newPost");
});
app.post("/blogpost", auth.isLoggedIn, async (req, res) => {
  await Blogpost.create({
    title: req.body.postTitle,
    body: req.body.postBody,
    user: req.params.id,
  });
  res.send("Blog Post Uploaded");
});
//<------------- ALL that Users Posts ---------------------------------->
app.get("/allposts/:id", async (req, res) => {
  const allposts = await Blogpost.find({ user: req.params.id }).populate(
    "user",
    "name"
  );
  console.log(allposts);

  res.render("userBlogPosts", {
    userPosts: allposts,
  });
});

//ADMIN SECTION
//<----------------ADMIN PAGE------------------->
app.get("/adminPage", auth.isLoggedIn, (req, res) => {
  if (req.userFound.admin) {
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
  if(req.userFound.admin){
    await User.findOneAndDelete(req.params.id);
  }
  res.render("userDeleted")
});

//<--------------- ADMIN UPDATE A USER -------------------------->
app.get("/adminUserUpdate/:id", auth.isLoggedIn, async (req, res) => {
  if(req.userFound.admin){
    
  }
  res.render("thisUser")
});

//LOGIN & LOGOUT SECTIONS
//<--------------------------Login ----------------------------------------------->>

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", async (req, res) => {
  const user = await User.findOne({ email: req.body.userEmail });
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
  res.redirect("/login");
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
