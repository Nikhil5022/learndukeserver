const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const session = require("express-session");
const mongoose = require("mongoose");
const { User, Job, Admin, Payment, Mentor, Review } = require("./schema");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const morgan = require("morgan");
// const router = require("./routes/paymentRoutes");
const cloudinary = require("cloudinary");
const { v2: cloud } = require("cloudinary");
const bodyParser = require("body-parser");
const fileUpload = require("express-fileupload");
const crypto = require("crypto");
const cron = require("node-cron");
// const OpenAIApi = require('openai');
// Initialize cors
const app = express();
app.use(cors("*"));

let MENTORVALIDITY = 0;

app.use(morgan("dev"));
app.use(bodyParser.json({ limit: "50mb" }));
app.use(
  bodyParser.urlencoded({
    limit: "50mb",
    extended: true,
    parameterLimit: 5000000,
  })
);
app.use(express.json());
app.use(fileUpload());

// Initialize OpenAI API
// const openai = new OpenAIApi({ key: process.env.OPENAI_API_KEY });

// app.post("/generateJobDescription", async (req, res) => {
//     const prompt = req.body.prompt;

//     try {
//         const completion = await openai.chat.completions.create({
//             messages: [{ role: "system", content: prompt }],
//             model: "text-davinci-codex",
//           });

//         const jobDescription = completion.data.choices[0].text.trim();
//         res.status(200).json({ jobDescription });
//     } catch (error) {
//         console.error("Error generating job description:", error);
//         res.status(500).json({ error: "Failed to generate job description" });
//     }
// });

// Connect to MongoDB Atlas
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("Connected to MongoDB Atlas");
  })
  .catch((err) => {
    console.error("Error connecting to MongoDB Atlas:", err.message);
  });

cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Express session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
  })
);

const Razorpay = require("razorpay");

// Passport middleware
app.use(passport.initialize());
app.use(passport.session());

// app.use("/api/v1", router)

const instance = new Razorpay({
  key_id: process.env.RZP_KEY_ID,
  key_secret: process.env.RZP_KEY_SECRET,
});

const checkout = async (req, res) => {
  try {
    const options = {
      amount: Number(req.body.amount * 100),
      currency: "INR",
      receipt: `R-YCYCLS+${new Date().getDate()}-${new Date().getMonth()}-${new Date().getFullYear()}-${new Date()
        .toTimeString()
        .substring(0, 8)}`,
    };

    const order = await instance.orders.create(options);

    await res.status(200).json({
      success: true,
      order,
    });
  } catch (e) {
    res.status(400).json({
      success: false,
      message: e.message,
    });
  }
};

const paymentVerification = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const { name, price, days } = req.params;

    const user = await User.findOne({ email: req.params.id });

    if (!user) {
      return res.status(404).send("User not found");
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSign = crypto
      .createHmac("sha256", process.env.RZP_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    // check both signs
    const isAuthentic = expectedSign === razorpay_signature;

    if (isAuthentic) {
      const paymentDate = new Date();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + parseInt(days));

      const paymentDetails = {
        paymentDate: paymentDate,
        plan: name,
        amount: price,
        status: "Completed",
        user: user.email,
        razorpay_order_id: razorpay_order_id,
        expirationDate: expirationDate,
        transactionId: razorpay_payment_id,
        razorpay_signature: razorpay_signature,
      };

      const payment = new Payment(paymentDetails);

      user.plans.push(payment.plan);
      user.payments.push(payment._id);
      user.isPremium = true;
      await payment.save();
      await user.save();
      res.redirect(`https://learnduke-frontend.vercel.app/paymentsuccess`);
    } else {
      res.redirect("https://learnduke-frontend.vercel.app/paymentfailed");
    }
  } catch (e) {
    res.redirect("https://learnduke-frontend.vercel.app/paymentfailed");
  }
};
const paymentVerification2 = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    const { name, price, days } = req.params;

    const user = await User.findOne({ email: req.params.id });

    if (!user) {
      return res.status(404).send("User not found");
    }

    const mentor = await Mentor.findOne({ email: user.email });

    if (!mentor) {
      return res.status(404).send("Mentor not found");
    }

    const sign = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSign = crypto
      .createHmac("sha256", process.env.RZP_KEY_SECRET)
      .update(sign.toString())
      .digest("hex");

    // check both signs
    const isAuthentic = expectedSign === razorpay_signature;

    if (isAuthentic) {
      const paymentDate = new Date();
      const expirationDate = new Date();
      expirationDate.setDate(expirationDate.getDate() + parseInt(days));

      const paymentDetails = {
        paymentDate: paymentDate,
        plan: name,
        amount: price,
        status: "Completed",
        user: user.email,
        razorpay_order_id: razorpay_order_id,
        expirationDate: expirationDate,
        transactionId: razorpay_payment_id,
        razorpay_signature: razorpay_signature,
      };

      const payment = new Payment(paymentDetails);

      if (MENTORVALIDITY < 20000 && payment.plan === "Premium") {
        mentor.plans.push("Lifetime");
        MENTORVALIDITY += 1;
      } else {
        mentor.plans.push(payment.plan);
      }
      mentor.payments.push(payment._id);

      mentor.isPremium = true;
      await payment.save();
      await mentor.save();
      await user.save();
      res.redirect(
        `https://learnduke-frontend.vercel.app/mentor/paymentsuccess`
      );
    } else {
      res.redirect("https://learnduke-frontend.vercel.app/paymentfailed");
    }
  } catch (e) {
    res.redirect("https://learnduke-frontend.vercel.app/paymentfailed");
  }
};

const sendKey = async (req, res) => {
  res.status(200).json({
    key: process.env.RZP_KEY_ID,
  });
};

// Google OAuth 2.0 configuration
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: "https://learndukeserver.vercel.app/auth/google/callback",
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
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
            profilephoto: {
              public_id: "1234",
              url: profilephoto,
            },
          });
          await user.save();
        } else {
          // If user exists, update their accessToken and profile photo
          user.accessToken = accessToken;
          user.profilephoto = {
            public_id: "1234",
            url: user.profilephoto.url,
          };
          await user.save();
        }
        done(null, user);
      } catch (error) {
        console.error("Error saving user details to database:", error);
        done(error, null);
      }
    }
  )
);

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
app.get(
  "/auth/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

// Google auth callback route
app.get(
  "/auth/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Successful authentication, redirect to home page or handle as needed
    res.redirect(
      `https://learnduke-frontend.vercel.app/?email=${req.user.email}&name=${req.user.name}&accessToken=${req.user.accessToken}`
    );
  }
);

// Logout route
app.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/");
});

// APIs
app.post("/addJob", async (req, res) => {
  try {
    let user = await User.findOne({ email: req.body.email });
    if (!user) {
      return res.status(404).send("User not found");
    }
    const job = req.body;
    
    job.imageLink = user.profilephoto.url;
    job.userName = user.name;

    console.log(job)
    
    const newJob = await Job(job); 
    user.jobs.push(job._id);

    await user.save();
    await newJob.save();
    res.send(newJob);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/getJobs", async (req, res) => {
  try {
    const {
      search,
      location,
      jobType,
      domain,
      education,
      page = 1,
      limit = 8,
    } = req.query;

    const query = {};
    if (search) {
      query.title = { $search: search };
    }
    if (location) {
      query.location = location;
    }
    if (jobType) {
      query.jobType = jobType;
    }
    console.log("Prev query object:", query);
    
    const orConditions = [];
    
    if (domain) {
        orConditions.push(...domain.map((d) => ({ domain: d })));
    }
      console.log("Next query object:", query);
    if (education) {
        orConditions.push(...education.map((e) => ({ education: e })));
    }

    // If there are any $or conditions, add them to the query
    if (orConditions.length > 0) {
      query.$or = orConditions;
    }
    console.log("Final query object:", query);
    // if (domain) {
    //   if (Array.isArray(domain)) {
    //     query.$or = domain.map((d) => ({ domain: d }));
    //   } else {
    //     query.domain = domain;
    //   }
    // }
    // if (education) {
    //   if (Array.isArray(education)) {
    //     query.$or = [
    //       ...(query.$or || []),
    //       ...education.map((e) => ({ education: e })),
    //     ];
    //   } else {
    //     query.education = education;
    //   }
    // }
    try {
      const jobs = await Job.find(query)
        .skip((page - 1) * limit)
        .limit(parseInt(limit));

      const totalJobs = await Job.countDocuments(query);

      res.status(200).json({
        jobs,
        totalJobs,
        totalPages: Math.ceil(totalJobs / limit),
        currentPage: parseInt(page),
      });
    } catch (error) {
      res.status(500).send(error);
    }
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

app.get("/getJobs/:email", async (req, res) => {
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
    user.jobs = user.jobs.filter(
      (jobId) => jobId.toString() !== req.params.jobId
    );

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
      return res.send({ message: "Admin not found" });
    }

    if (admin.password !== password) {
      return res.send({ message: "Invalid password" });
    }

    const token = jwt.sign({ email }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });

    res.send({ message: "Login successful", token });
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).send("Server error");
  }
});

app.post("/updateUserInfo/:email", async (req, res) => {
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

app.post("/editUserData/:email", async (req, res) => {
  const { userData, imageChange } = req.body;
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).send("User not found");
    }

    if (imageChange) {
      const imageId = user.profilephoto ? user.profilephoto.public_id : null;

      // Check if there's an existing image to delete
      if (imageId !== "1234") {
        try {
          await cloudinary.uploader.destroy(imageId);
        } catch (cloudinaryError) {
          console.error(
            "Error deleting previous profile photo:",
            cloudinaryError
          );
        }
      }

      try {
        const newPic = await cloudinary.uploader.upload(
          userData.profilephoto.url,
          {
            folder: "LearnDuke",
            width: 150,
            crop: "scale",
          }
        );

        userData.profilephoto = {
          public_id: newPic.public_id,
          url: newPic.secure_url,
        };
      } catch (uploadError) {
        console.error("Error uploading new profile photo:", uploadError);
        return res.status(500).send("Error uploading profile photo");
      }
    }

    // Update the user fields that are present in the request body
    Object.keys(userData).forEach((key) => {
      user[key] = userData[key];
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
app.get("/getJobById/:jobId", async (req, res) => {
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

app.get("/getSimilarJobs/:jobId", async (req, res) => {
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
      tags: { $in: tags },
    });

    res.send(similarJobs);
  } catch (error) {
    console.error("Error fetching similar jobs:", error);
    res.status(500).send(error);
  }
});

const checkExpiringSubscritions = async () => {
  const payments = await Payment.find({ expirationDate: new Date() });
  payments.forEach(async (payment) => {
    const user = await User.findOne({ email: payment.user });
    user.isPremium = false;
    await user.save();
  });
};

cron.schedule("0 0 * * *", () => {
  checkExpiringSubscritions();
  checkingMentorValidity();
});

const checkingMentorValidity = async () => {
  const mentors = await Mentor.find();
  const date = new Date();
  mentors.forEach(async (mentor) => {
    const payments = await Payment.find({ user: mentor.email });
    payments.forEach(async (payment) => {
      const date1 = new Date(payment.expirationDate);
      date1.setDate(date1.getDate() + 1);
      if (date1 < date) {
        mentor.plans.map((plan, index) => {
          if (plan === payment.plan && plan !== "Lifetime") {
            mentor.plans.splice(index, 1);
            mentor.isPremium = false;
          }
        });
        await mentor.save();
      }
    });
  });
};

cron.schedule("* * * * *", async () => {
  // now i need to get data of how many jobs have been posted on different domanins
  // and then send the email to the user

  // create a dictionary of domain and count
  const domainCount = {};
  const jobs = await Job.find({ isReviewed: true });
  // jobs posted only today
  const today = new Date();
  const todayJobs = jobs.filter(
    (job) => job.postedOn.getDate() === today.getDate()
  );
  todayJobs.forEach((job) => {
    if (domainCount[job.domain]) {
      domainCount[job.domain] += 1;
    } else {
      domainCount[job.domain] = 1;
    }
  });

  const users = await User.find();
  users.forEach(async (user) => {
    if (user.jobAllerts) {
      const email = user.email;
      let message = "Hi, here are the job alerts for today:\n\n";
      Object.keys(domainCount).forEach((domain) => {
        message += `${domain}: ${domainCount[domain]} jobs\n`;
      });
    }
  });
});

app.post("/jobAlerts/:email", async (req, res) => {
  try {
    const email = req.params.email;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).send("User not found");
    }
    user.jobAllerts = req.body.jobAlerts;
    await user.save();
    res.send(user);
  } catch (error) {
    res.status(500, error);
  }
});

app.get("/getReviewedJobs", async (req, res) => {
  try {
    const { title, location, jobType, domain, education, page = 1, limit = 2 } = req.query;

    let query = {};
    if (title) {
      query.title = { $regex: new RegExp(title, "i") };
      
    }
    if (typeof location === "string" && location.trim() !== "") {
      query.location = { $regex: new RegExp(location.trim(), "i") };
      
    }
    if (typeof jobType === "string" && jobType.trim() !== "") {
      query.jobType = { $regex: new RegExp(jobType.trim(), "i") };
      
    }
    query.isReviewed = true;
    
    const orConditions = [];
    
    if (domain) {
      orConditions.push(...domain.map((d) => ({ domain: d })));
      
    }
    if (education) {
      orConditions.push(...education.map((e) => ({ education: e })));
      
    }
    
    // If there are any $or conditions, add them to the query
    if (orConditions.length > 0) {
      query.$or = orConditions;
      
    }

    try {
      const jobs = await Job.find(query)
        .skip((page - 1) * limit)
        .limit(parseInt(limit));
      const totalJobs = await Job.countDocuments(query);

      res.status(200).json({
        jobs,
        totalJobs,
        totalPages: Math.ceil(totalJobs / limit),
        currentPage: parseInt(page),
      });
    } catch (error) {
      console.error("Error fetching jobs:", error);
      res.status(500).send("Error fetching jobs");
    }
  } catch (error) {
    console.error("Server error:", error);
    res.status(500).send("Server error");
  }
});

app.post("/undoReview/:jobId", async (req, res) => {
  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.jobId },
      { $set: { isReviewed: false } },
      { new: true }
    );

    if (!job) {
      return res.status(404).send("Job not found");
    }

    res.send(job);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post("/rejectJob/:jobId", async (req, res) => {
  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.jobId },
      { $set: { isRejected: true } },
      { new: true }
    );

    if (!job) {
      return res.status(404).send("Job not found");
    }

    res.send(job);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post("/approveJob/:jobId", async (req, res) => {
  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.jobId },
      { $set: { isReviewed: true } },
      { new: true }
    );

    if (!job) {
      return res.status(404).send("Job not found");
    }

    res.send(job);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.post("/undoReject/:jobId", async (req, res) => {
  try {
    const job = await Job.findOneAndUpdate(
      { _id: req.params.jobId },
      { $set: { isRejected: false } },
      { new: true }
    );

    if (!job) {
      return res.status(404).send("Job not found");
    }

    res.send(job);
  } catch (error) {
    res.status(500).send(error);
  }
});

// emails section

app.post("/sendEmail", async (req, res) => {
  try {
    const { to, subject, text } = req.body;
    const mailOptions = {
      from: process.env.EMAIL,
      to,
      subject,
      text,
    };

    await transporter.sendMail(mailOptions);
    res.send("Email sent successfully");
  } catch (error) {
    console.error("Error sending email:", error);
    res.status(500).send("Internal server error");
  }
});

app.get("/getSubscriptions/:email", async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).send("User not found");
    }
    const subscriptions = user.payments;
    const allPayments = [];
    for (let i = 0; i < subscriptions.length; i++) {
      const payment = await Payment.findOne({ _id: subscriptions[i] });
      allPayments.push(payment);
    }
    res.send(allPayments); // Send the allPayments array
  } catch (error) {
    res.status(500).send(error);
  }
});

// mentors section

app.post("/addMentor/:email", async (req, res) => {
  try {
    let user = await User.findOne({ email: req.params.email });
    if (!user) {
      return res.status(404).send("User not found");
    }
    let mentorData = await req.body;
    
    //cloudinary image
    try {
      const newPic = await cloudinary.uploader.upload(mentorData.profilePhoto, {
        folder: "LearnDuke",
        width: 150,
        crop: "scale",
      });

      mentorData.profilePhoto = {
        public_id: newPic.public_id,
        url: newPic.secure_url,
      };
    } catch (uploadError) {
      console.log("Error uploading new profile photo:", uploadError);
    }
    const mentorDataWithEmail = { ...mentorData, email: user.email, name: user.name};

    const mentor = new Mentor(mentorDataWithEmail);
    await mentor.save();
    res.send("Success");
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/getMentors", async (req, res) => {
  try {
    const mentors = await Mentor.find({ isPremium: true });
    if(!mentors){
      console.log("No mentors found")
      res.status(201).send("No mentors found")
    }
    // const mentorsWithUserDetails = [];
    // for (const mentor of mentors) {
    //   try {
    //     const user = await User.findOne({ email: mentor.email });
    //     if (!user) {
    //       console.warn(`User not found for mentor with email: ${mentor.email}`);
    //     } else {
    //       // Create a new object by spreading mentor data and adding name and isPremium properties
    //       const mentorWithUserDetails = {
    //         ...mentor.toObject(), // Convert Mongoose document to plain JavaScript object
    //         name: user.name,
    //         isPremium: user.isPremium,
    //       };
    //       mentorsWithUserDetails.push(mentorWithUserDetails);
    //     }
    //   } catch (error) {
    //     console.error("Error fetching user for mentor:", error);
    //   }
    // }
    
    res.send(mentors);
  } catch (error) {
    console.error("Error fetching mentors:", error);
    res.status(500).send(error);
  }
});

app.get("/getMentor/:id", async (req, res) => {
  try {
    const mentor = await Mentor.findOne({ _id: req.params.id });
    if (!mentor) {
      return res.status(404).send("Mentor not found");
    }

    // Get reviews of mentor
    const reviewsPromises = mentor.reviews.map((reviewId) =>
      Review.findOne({ _id: reviewId })
    );
    const reviews = await Promise.all(reviewsPromises);

    // Get data from user
    const user = await User.findOne({ email: mentor.email });
    if (!user) {
      return res.status(404).send("User not found");
    }

    // Append data of user into mentor object
    const mentorWithUserDetails = {
      ...mentor.toObject(),
      name: user.name,
      isPremium: user.isPremium,
      jobs: user.jobs,
      linkedin: user.linkedin,
      github: user.github,
      bio: user.bio,
      payments: user.payments,
      plans: user.plans,
      jobAllerts: user.jobAllerts,
      reviews: reviews,
    };

    res.send(mentorWithUserDetails);
  } catch (error) {
    console.error("Error fetching mentor data:", error); // Log the error for debugging
    res.status(500).send("An error occurred while fetching mentor data.");
  }
});

app.get("/isAlreadyMentor/:email", async (req, res) => {
  try {
    const mentor = await Mentor.findOne({ email: req.params.email });
    if (mentor) {
      res.json({ success: true, mentor });
    } else {
      res.send(false);
    }
  } catch (error) {
    res.status(500).send(error);
  }
});

app.put("/updateMentor/:email", async (req, res) => {
  try {
    const mentor = await Mentor.findOne({ email: req.params.email });
    if (!mentor) {
      return res.status(404).send("Mentor not found");
    }

    // if type of res.body.profilePhoto is string then upload the image to cloudinary and destroy previous image
    if (typeof req.body.profilePhoto == "string") {
      const imageId = mentor.profilePhoto
        ? mentor.profilePhoto.public_id
        : null;

      // Check if there's an existing image to delete
      if (imageId && imageId !== "1234") {
        try {
          await cloudinary.uploader.destroy(imageId);
        } catch (cloudinaryError) {
          console.error(
            "Error deleting previous profile photo:",
            cloudinaryError
          );
        }
      }

      try {
        const newPic = await cloudinary.uploader.upload(req.body.profilePhoto, {
          folder: "LearnDuke",
          width: 150,
          crop: "scale",
        });

        req.body.profilePhoto = {
          public_id: newPic.public_id,
          url: newPic.secure_url,
        };
      } catch (uploadError) {
        console.error("Error uploading new profile photo:", uploadError);
        return res.status(500).send("Error uploading profile photo");
      }
    }

    const newMentor = await Mentor.findByIdAndUpdate(mentor._id, req.body, {
      new: true,
      runValidators: true,
      useFindAndModify: false,
    });

    await mentor.save();
    res.send(newMentor);
  } catch (error) {
    res.status(500).send(error);
  }
});

app.get("/", (req, res) => {
  res.send("Home Page");
});

app.post("/checkout", checkout);
app.post("/verify/payment/:id/:name/:price/:days", paymentVerification);
app.post("/verify/payment/mentor/:id/:name/:price/:days", paymentVerification2);
app.get("/getkey", sendKey);

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
