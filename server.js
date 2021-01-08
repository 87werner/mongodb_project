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
//<------------------- User Profile -------------------------------> @@@@@@
app.get("/profile", auth.isLoggedIn, async (req, res) => {
  console.log("GOT name from auth ");
  console.log(req.userFound.name);

  const userDB = req.userFound; //  = const userDB = await User.findById(req.params.id)
  console.log(userDB);
  res.render("profile", {
    user: userDB,
  });
  if(req.userFound.admin == true){ // have to have this in every route where its only accessible to admins
          res.redirect("/adminPage")  
//   }else{
//      res.redirect("profile")
//   }
}
})

//<----------------ADMIN PAGE------------------->
app.get("/adminPage", (req,res) => {
   res.render("adminPage")
})

//<--------------- DELETE ---------------------->
app.get("/delete", (req, res) => {
  res.render("delete");
});
app.post("/delete/:id", async (req, res) => {
  //working well with Id

  await User.findByIdAndDelete(req.params.id);

  res.send("User Deleted");
});

// app.get("/update/:id",(req,res) =>{
//    res.render("userUpdate")
// })

// app.post('/update/:id', async (req,res) => {
//    let name = req.body.userName;
//   let email = req.body.userEmail;
//   let password = req.body.userPassword;
//       await User.findByIdAndUpdate(req.params.id),{
//          name: name,
//          email:email,
//          // password:password
//       }
//    res.send('user updated')
// })

app.get("/blogpost/:id", (req, res) => {
  console.log(req.params.id);
  res.render("newPost", {
    userId: req.params.id,
  });
});
app.post("/blogpost/:id", async (req, res) => {
  await Blogpost.create({
    title: req.body.postTitle,
    body: req.body.postBody,
    user: req.params.id,
  });
  res.send("Blog Post Uploaded");
});
//<------------- 
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
  }else {
    res.send("Login Detail Incorrect");
  }
});


//<--------- ROUTE NOT FOUND ----------------------------->
app.get("/*", (req, res) => {
  res.send("Send page doesn't exist");
});

//<--------- THE PORT THE SERVER IS RUNNING ON------------->
app.listen(5000, () => {
  console.log("Server is running on port 5000");
});
