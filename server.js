require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const mysql = require('mysql');
const twilio = require('twilio');

// Initialize Express App
const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Twilio Configuration
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER; 

// MySQL Database Connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => {
    if (err) throw err;
    console.log('Database connected!');
});

// Handle Incoming WhatsApp Messages

app.get('/', (req, res) => {
    res.send('Welcome to the back end');
});


app.post('/webhook', (req, res) => {
    const { Body, From } = req.body; // WhatsApp message body and sender's number
    const userMessage = Body.trim();
    const userPhone = From.replace('whatsapp:', ''); // Extract phone number

    if (userMessage.toLowerCase() === 'hi') {
        sendWhatsAppMessage(userPhone, 'Welcome! Choose an option:\n1. Your Account Statement\n2. Your Balance\n3. Exit');
    } else if (userMessage === '1') {
        getAccountInfo(userPhone, 'statement', (response) => {
            sendWhatsAppMessage(userPhone, response);
        });
    } else if (userMessage === '2') {
        getAccountInfo(userPhone, 'balance', (response) => {
            sendWhatsAppMessage(userPhone, response);
        });
    } else if (userMessage === '3') {
        sendWhatsAppMessage(userPhone, 'Goodbye! Have a great day!');
    } else {
        sendWhatsAppMessage(userPhone, 'Invalid option. Please type "Hi" to start again.');
    }

    res.sendStatus(200);
});

// Function to Send WhatsApp Messages
const sendWhatsAppMessage = (to, message) => {
    client.messages
        .create({
            from: `whatsapp:${TWILIO_PHONE_NUMBER}`,
            body: message,
            to: `whatsapp:${to}`,
        })
        .then((message) => console.log(`Message sent: ${message.sid}`))
        .catch((err) => console.error(err));
};

// Function to Get Account Information from Database
const getAccountInfo = (phone, field, callback) => {
    const query = `SELECT ${field} FROM accounts WHERE phone_number = ?`;
    db.query(query, [phone], (err, results) => {
        if (err) {
            console.error(err);
            callback('Error fetching account details.');
        } else if (results.length > 0) {
            if (field === 'statement') {
                callback(`Your account statement: ${results[0].statement}`);
            } else if (field === 'balance') {
                callback(`Your account balance: $${results[0].balance}`);
            }
        } else {
            callback('Account not found. Please contact support.');
        }
    });
};

// Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
