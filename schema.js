import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true
    },
    jobs: {
        type: [String], // Array of job IDs or job names
        default: []
    },
    profilephoto: {
        // type: String,
        // default: ''
        public_id: {
            type: String,
            required: true,
            default: "1234",
          },
          url: {
            type: String,
            required: true,
          },
    },
    isPremium: {
        type: Boolean,
        default: false
    },
    linkedin: {
        type: String,
        default: ''
    },
    github: {
        type: String,
        default: ''
    },
    phoneNumber: { 
        type: String,
        default: ''
    },
    whatsappNumber: {
        type: String,
        default: ''
    },
    bio: {
        type: String,
        default: ''
    }

});


const jobSchema = new mongoose.Schema({
    title: {
        type: String,
    },
    description: {
        type: String,
    },
    minAmountPerHour: {
        type: Number,
    },
    maxAmountPerHour: {
        type: Number,
    },
    jobType: {
        type: String,
    },
    location: {
        type: String,
    },
    phoneNumber: {
        type: String,
    },
    whatsappNumber: {
        type: String,
    },
    countryCode: {
        type: String,
    },
    email: {
        type: String,
    },
    responsibilities: {
        type: String,
        default: ''
    },
    requirements: {
        type: String,
        default: ''
    },
    tags: {
        type: [String],
        default: []
    }
    
});

const adminSchema = new mongoose.Schema({
    email: {
        type: String,
        unique: true
    },
    password: {
        type: String
    }
});

const Admin = mongoose.model("Admin", adminSchema);
const Job = mongoose.model("Job", jobSchema);
const User = mongoose.model("User", userSchema);


export  {Admin, Job, User};