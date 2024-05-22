import Razorpay from "razorpay";
const paymentAPI = async () => {
    try {
        const instance = new Razorpay({
            key_id: process.env.RZP_KEY_ID,
            key_secret: process.env.RZP_KEY_SECRET,
        })
        console.log('Payment integration successful.')
        return instance;
    } catch (error) {
        console.log("Error connecting payment api : " + error)
    }
}

export default paymentAPI;