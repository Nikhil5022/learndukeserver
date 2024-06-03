// import mongoose from "mongoose";
const mongoose = require('mongoose');


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
    },
    payments: {
        type: [mongoose.Schema.Types.ObjectId],
        ref: 'Payment',
        default: []
    },
    plans: {
        type: [String],
        default: []
    },  

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
    },
    domain: {
        type: String,
        default: ''
    },
    isReviewed: {
        type: Boolean,
        default: false
    },
    isRejected: {
        type: Boolean,
        default: false
    },
    
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


const paymentSchema = new mongoose.Schema({
    
    plan: {
        type: String,
        enum: ["Basic", "Advance", "Premium","Teacher Pro"],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    paymentDate: {
        type: Date,
        default: Date.now
    },
    razorpay_order_id: {
        type: String,
        required: true,
        unique: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Completed', 'Failed'],
        default: 'Pending'
    },
    razorpay_payment_id: {
        type: String,
        default: ''
    },
    razorpay_signature: {
        type: String,
        default: ''
    },
    user: {
        type: "String",
        required: true
    },
    expirationDate: {
        type: Date,
        required: true
    },
    transactionId: {
        type: String,
        required: true,
        unique: true, // Ensures the transactionId is unique
      },
});

const Admin = mongoose.model("Admin", adminSchema);
const Job = mongoose.model("Job", jobSchema);
const User = mongoose.model("User", userSchema);
const Payment = mongoose.model("Payment", paymentSchema);


// export  {Admin, Job, User};
module.exports = {Admin, Job, User, Payment};