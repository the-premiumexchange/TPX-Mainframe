// TPX Stripe Webhook: The "Shot Clock" Starter
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

module.exports = async function (context, req) {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        // Verify the event came from Stripe
        event = stripe.webhooks.constructEvent(req.rawBody, sig, process.env.STRIPE_WEB_SEC);
    } catch (err) {
        context.res = { status: 400, body: `Webhook Error: ${err.message}` };
        return;
    }

    // Handle the specific "Payment Succeeded" event
    if (event.type === 'payment_intent.succeeded') {
        const paymentIntent = event.data.object;
        
        // Log the transaction and START THE 15-MINUTE TIMER in Cosmos DB
        const transactionData = {
            id: paymentIntent.id,
            sellerId: paymentIntent.metadata.sellerId,
            buyerId: paymentIntent.metadata.buyerId,
            status: 'Pending_Response',
            startTime: new Date().toISOString(),
            deadline: new Date(Date.now() + 15 * 60000).toISOString(), // +15 mins
            feePercentage: 5 // Starting base fee
        };

        // This data gets pushed to your 'ActiveInquiries' container
        context.bindings.outputDocument = JSON.stringify(transactionData);
        context.log(`Transaction ${paymentIntent.id} initialized. Shot clock started.`);
    }

    context.res = { status: 200 };
};