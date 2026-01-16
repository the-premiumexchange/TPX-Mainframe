// TPX WATCHDOG: THE 15-MINUTE PENALTY ENGINE
const { CosmosClient } = require("@azure/cosmos");

module.exports = async function (context, myTimer) {
    const client = new CosmosClient(process.env.COSMOS_DB_CONNECTION);
    const container = client.database("TPX_DB").container("Transactions");

    // 1. Query for sellers who missed their 15-minute response deadline
    const querySpec = {
        query: "SELECT * FROM c WHERE c.status = 'Pending_Response' AND c.deadline < GetCurrentDateTime()"
    };

    const { resources: lateSellers } = await container.items.query(querySpec).fetchAll();

    for (const txn of lateSellers) {
        // 2. Escalation Logic: Increase fee by 1% (capped at 10%)
        let newFee = Math.min(txn.feePercentage + 1, 10);
        
        // 3. Update the transaction state
        txn.feePercentage = newFee;
        txn.status = (newFee >= 10) ? "Max_Penalty_Reached" : "Penalty_Applied";
        
        await container.items.upsert(txn);
        context.log(`Penalty Applied: Txn ${txn.id} escalated to ${newFee}% fee.`);
    }
};