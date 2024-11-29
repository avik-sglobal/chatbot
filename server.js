const express = require("express");
const mongoose = require("mongoose");
const { MessagingResponse } = require("twilio").twiml; // Correct import for MessagingResponse
const twilio = require("twilio");
require("dotenv").config();

// Initialize Express App
const app = express();

// Middleware for parsing JSON and URL-encoded data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Twilio Configuration
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER; // Your Twilio WhatsApp number
const client = twilio(accountSid, authToken);

// MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => console.error("MongoDB connection error:", err));

// Define the User Schema for MongoDB
const userSchema = new mongoose.Schema({
  name: String,
  phone: String,
  accountBalance: Number,
  transactions: [
    {
      date: String,
      description: String,
      amount: Number,
    },
  ],
});

const User = mongoose.model("account_details", userSchema);

// Webhook Endpoint for WhatsApp
app.post("/webhook", async (req, res) => {

    console.log("Request received:", req.body);

  const incomingMessage = req.body.Body.trim(); // Message text from the user
  const userPhone = req.body.From.replace("whatsapp:", ""); // Extract WhatsApp phone number

  const twiml = new MessagingResponse(); // For constructing a Twilio-friendly response

  try {
    // Fetch the user from MongoDB using the phone number
    let user = await User.findOne({ phone: userPhone });
    console.log('Phone Number: ',userPhone);
    console.log(user);

    if (!user) {
      // If the user doesn't exist, create a new user
      user = new User({
        name: "New User",
        phone: userPhone,
        accountBalance: 0,
        transactions: [],
      });
      await user.save();

      // Send a welcome message via Twilio
      const welcomeMessage =
        "Welcome to the chatbot! Your account has been created. Reply with:\n1. Account Statement\n2. Balance\n3. Exit";
      client.messages.create({
        body: welcomeMessage,
        from: `whatsapp:${twilioPhoneNumber}`,
        to: `whatsapp:${userPhone}`,
      });

      return res.status(200).send("Welcome message sent.");
    }

    // Handle user responses
    switch (incomingMessage) {
      case "1": // Account Statement
        const statement = user.transactions.length > 0 ? user.transactions
                .map((t) => `${t.date}: ${t.description} - $${t.amount}`)
                .join("\n")
            : "No transactions found.";

/*         client.messages.create({
          body: `Your Account Statement:\n${statement}`,
          from: `whatsapp:${twilioPhoneNumber}`,
          to: `whatsapp:${userPhone}`,
        }); */

        break;

      case "2": // Account Balance

      console.log(`Your Account Balance is $${user.accountBalance}`);
/*         client.messages.create({
          body: `Your Account Balance is $${user.accountBalance}`,
          from: `whatsapp:${twilioPhoneNumber}`,
          to: `whatsapp:${userPhone}`,
        }); */

        break;

      case "3": // Exit
/*         client.messages.create({
          body: "Thank you for using the chatbot! Goodbye.",
          from: `whatsapp:${twilioPhoneNumber}`,
          to: `whatsapp:${userPhone}`,
        }); */

        break;

      default:
        // Invalid input
/*         client.messages.create({
          body: "Invalid option. Reply with:\n1. Account Statement\n2. Balance\n3. Exit",
          from: `whatsapp:${twilioPhoneNumber}`,
          to: `whatsapp:${userPhone}`,
        }); */

    }

    res.status(200).send("Message processed2.");
  } catch (err) {
    console.error("Error handling message:", err);
    twiml.message("Sorry, something went wrong. Please try again later.");
    res.status(500).type("text/xml").send(twiml.toString());
  }
});

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
