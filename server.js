// Load environment variables from .env file
import dotenv from "dotenv";
dotenv.config();
import express from "express";
import passport from "passport";
import GoogleStrategy from "passport-google-oauth20/lib/strategy.js";
import session from "express-session";
import mongoose from "mongoose";
import { User, Job, Admin } from "./schema.js";
import cors from "cors";
import jwt from "jsonwebtoken";
import morgan from "morgan";
import paymentAPI from "./config/razorpay.js";
import router from "./routes/paymentRoutes.js";
import cloudinary from "cloudinary"
import { v2 as cloud } from "cloudinary";
import bodyParser from "body-parser";
import fileUpload from "express-fileupload";

// Initialize cors
const app = express();
app.use(cors());
app.use(morgan("dev"));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: "50mb", extended: true, parameterLimit: 5000000}));
app.use(express.json());
app.use(fileUpload());

// Connect to MongoDB Atlas
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log("Connected to MongoDB Atlas");
}).catch((err) => {
    console.error("Error connecting to MongoDB Atlas:", err.message);
});

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });  

// Express session middleware
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true
}));

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

app.use("/api/v1", router)

export const instance = await paymentAPI();

// Google OAuth 2.0 configuration
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/callback"
},
    async (accessToken, refreshToken, profile, done) => {
        try {
            console.log("Google profile:", profile);
            const email = profile.emails[0].value;
            const name = profile.displayName;
            const profilephoto = profile.photos[0].value;

            // Check if user already exists
            let user = await User.findOne({ email: email });
            if (!user) {
                // If user doesn't exist, create a new one
                user = new User({
                    email: email,
                    name: name,
                    jobs: [],
                    accessToken: accessToken,
                    profilephoto:{
                        public_id: "1234",
                        url: profilephoto
                    }
                });
                await user.save();
            } else {
                // If user exists, update their accessToken and profile photo
                user.accessToken = accessToken;
                user.profilephoto = {
                    public_id: "1234",
                    url: user.profilephoto.url
                };
                await user.save();
            }

            console.log("User details saved to database:", user);
            done(null, user);
        } catch (error) {
            console.error("Error saving user details to database:", error);
            done(error, null);
        }
    }
));

// Serialize user
passport.serializeUser((user, done) => {
    done(null, user);
});

// Deserialize user
passport.deserializeUser((user, done) => {
    done(null, user);
});

// Routes
app.get("/", (req, res) => {
    res.send("Home Page");
});

// Google auth route
app.get("/auth/google",
    passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google auth callback route
app.get("/auth/google/callback",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        // Successful authentication, redirect to home page or handle as needed
        res.redirect(`http://localhost:5173/?email=${req.user.email}&name=${req.user.name}&accessToken=${req.user.accessToken}`);
    }
);

// Logout route
app.get("/logout", (req, res) => {
    req.logout();
    res.redirect("/");
});

// APIs
app.post("/addJob", async (req, res) => {
    console.log(req.body);
    const job = new Job(req.body);
    try {
        let user = await User.findOne({ email: req.body.email });
        if (!user) {
            return res.status(404).send("User not found");
        }
        console.log(user);
        user.jobs.push(job._id);

        await user.save();
        await job.save();
        res.send(job);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get("/getJobs", async (req, res) => {
    try {
        const jobs = await Job.find();
        res.send(jobs);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get("/getUser/:email", async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        res.send(user);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get("/getUsers", async (req, res) => {
    try {
        const users = await User.find();
        res.send(users);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post("/updateUser/:email", async (req, res) => {
    try {
        const user = await User.findOneAndUpdate(
            { email: req.params.email },
            { $set: { isPremium: req.body.isPremium } },
            { new: true }
        );

        if (!user) {
            return res.status(404).send("User not found");
        }

        res.send(user);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.get('/getJobs/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) {
            return res.status(404).send("User not found");
        }
        let jobs = [];
        for (let i = 0; i < user.jobs.length; i++) {
            const job = await Job.findOne({ _id: user.jobs[i] });
            jobs.push(job);
        }

        res.send(jobs);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.delete("/deleteJob/:jobId", async (req, res) => {
    try {
        const job = await Job.findOneAndDelete({ _id: req.params.jobId });
        if (!job) {
            return res.status(404).send("Job not found");
        }

        const user = await User.findOne({ email: job.email });
        if (!user) {
            return res.status(404).send("User not found");
        }

        // Remove job from user's jobs array
        user.jobs = user.jobs.filter(jobId => jobId.toString() !== req.params.jobId);

        await user.save();

        res.send(job);
    } catch (error) {
        res.status(500).send(error);
    }
});

app.post("/login", async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ email });

        if (!admin) {
            return res.send({ message: "Admin not found" })
        }

        if (admin.password !== password) {
            return res.send({ message: "Invalid password" })
        }

        const token = jwt.sign({ email }, process.env.JWT_SECRET, { expiresIn: "1h" });

        res.send({ message: "Login successful", token })
    } catch (error) {
        console.error("Server error:", error);
        res.status(500).send("Server error");
    }
});


app.post('/updateUserInfo/:email', async (req, res) => {
    try {
        const user = await User.findOne({ email: req.params.email });
        if (!user) {
            return res.status(404).send("User not found");
        }
        user.linkedin = req.body.linkedin;
        user.github = req.body.github;
        user.phoneNumber = req.body.phoneNumber;
        user.whatsappNumber = req.body.whatsappNumber;
        user.bio = req.body.bio;
        await user.save();
        res.send(user);
    } catch (error) {
        res.status(500).send(error);
    }
});


app.post('/editUserData/:email', async (req, res) => {
    const data = req.body;
    try {
        const user = await User.findOne({ email: req.params.email });

        if(data.profilephoto){
            const imageId = user.profilephoto.public_id && user.profilephoto.public_id;
            
            await cloud.uploader.destroy(imageId);

            const newPic = await cloud.uploader.upload(data.profilephoto.url, {
                folder: "LearnDuke",
                width: 150,
                crop: "scale",
            });
            
            data.profilephoto = {
                public_id: newPic.public_id,
                url: newPic.secure_url,
            };

            
        }
        // Update the user fields that are present in the request body
        Object.keys(data).forEach(key => {
            user[key] = data[key];
        });

        // Save the updated user
        await user.save();

        res.status(200).send("User data updated successfully");
    } catch (error) {
        console.error("Error updating user data:", error);
        res.status(500).send("Internal server error");
    }
});

// get job by id
app.get('/getJobById/:jobId', async (req, res) => {
    try {
        const job = await Job.findOne({ _id: req.params.jobId });
        if (!job) {
            return res.status(404).send("Job not found");
        }
        res.send(job);
    } catch (error) {
        res.status(500).send(error);
    }
});


app.get('/getSimilarJobs/:jobId', async (req, res) => {
    try {
        const jobId = req.params.jobId;

        // Fetch the current job by its ID
        const currjob = await Job.findById(jobId);
        if (!currjob) {
            return res.status(404).send("Job not found");
        }


        const tags = currjob.tags;
        if (!tags || tags.length === 0) {
            return res.status(404).send("No similar jobs found");
        }


        // Find jobs with at least one matching tag, excluding the current job
        const similarJobs = await Job.find({
            _id: { $ne: currjob._id },
            tags: { $in: tags }
        });


        res.send(similarJobs);
    } catch (error) {
        console.error("Error fetching similar jobs:", error);
        res.status(500).send(error);
    }
});

app.get("/", (req, res) => {
    res.send("Home Page");
});




// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
