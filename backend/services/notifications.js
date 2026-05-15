const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

async function sendDelayAlert(recipientEmail, passengerName, trainName, trainNumber, delayMinutes, currentStation, predictedArrival) {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: recipientEmail,
        subject: `Ceylon Track Alert: ${trainName} is delayed by ${delayMinutes} minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">Ceylon Track</h1>
                </div>
                <div style="padding: 20px;">
                    <p>Dear ${passengerName},</p>
                    <p>We are writing to inform you about a delay on your watched journey.</p>
                    <p><strong>${trainName} (Train No. ${trainNumber})</strong> is currently experiencing a delay.</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <div style="font-size: 48px; font-weight: bold; color: #f59e0b;">${delayMinutes} MINS</div>
                        <div style="font-size: 16px; color: #666; text-transform: uppercase; letter-spacing: 1px;">Delayed</div>
                    </div>
                    <p><strong>Current Station:</strong> ${currentStation}</p>
                    <p><strong>Predicted Arrival:</strong> ${predictedArrival}</p>
                    <p>We apologize for any inconvenience caused. We will continue to monitor the journey.</p>
                </div>
                <div style="background-color: #f8fafc; color: #64748b; padding: 15px; text-align: center; font-size: 12px;">
                    This is an automated alert from Ceylon Track — Sri Lanka Railway Information System.
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Delay alert sent to ${recipientEmail} for ${trainName}`);
    } catch (error) {
        console.error(`Failed to send delay alert to ${recipientEmail}:`, error);
        // Do not throw to prevent crashing jobs
    }
}

async function sendDepartureReminder(recipientEmail, passengerName, trainName, trainNumber, departureTime, platform) {
    const mailOptions = {
        from: process.env.EMAIL_FROM,
        to: recipientEmail,
        subject: `Ceylon Track Reminder: ${trainName} departs in 30 minutes.`,
        html: `
            <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: 0 auto; border: 1px solid #ddd; border-radius: 8px; overflow: hidden;">
                <div style="background-color: #4f46e5; color: white; padding: 20px; text-align: center;">
                    <h1 style="margin: 0; font-size: 24px;">Ceylon Track</h1>
                </div>
                <div style="padding: 20px;">
                    <p>Dear ${passengerName},</p>
                    <p>Your journey is about to begin!</p>
                    <p><strong>${trainName} (Train No. ${trainNumber})</strong> is scheduled to depart soon.</p>
                    <div style="margin: 20px 0; padding: 15px; background-color: #f8fafc; border-radius: 6px;">
                        <p style="margin: 5px 0;"><strong>Departure Time:</strong> ${departureTime}</p>
                        <p style="margin: 5px 0;"><strong>Platform:</strong> ${platform}</p>
                    </div>
                    <p>Have a safe journey!</p>
                </div>
                <div style="background-color: #f8fafc; color: #64748b; padding: 15px; text-align: center; font-size: 12px;">
                    This is an automated alert from Ceylon Track — Sri Lanka Railway Information System.
                </div>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Departure reminder sent to ${recipientEmail} for ${trainName}`);
    } catch (error) {
        console.error(`Failed to send departure reminder to ${recipientEmail}:`, error);
    }
}

module.exports = {
    sendDelayAlert,
    sendDepartureReminder
};
