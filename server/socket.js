module.exports = function initializeSocket(io, db) {
    // Initialize stock data
    const itemsStock = {};

    // Central function to fetch and broadcast stock
    async function fetchAndBroadcastStock() {
        try {
            const results = await db.getItemsStock(); // Fetch fresh stock
            results.forEach(item => {
                itemsStock[item.ItemID] = {
                    name: item.Name,
                    stock: item.Stock,
                };
            });
            io.emit('stock-update', itemsStock); // Broadcast to all clients
            console.log("Stock broadcasted:", itemsStock);
        } catch (err) {
            console.error("Error fetching stock:", err);
        }
    }

    // Load initial stock
    fetchAndBroadcastStock();

    io.on('connection', (socket) => {
        console.log(`Client connected: ${socket.id}`);

        // Send current stock to the newly connected client
        socket.emit('stock-update', itemsStock);

        // Listen for stock decrement requests
        socket.on('decrement-stock', async (productId) => {
            if (itemsStock[productId]) {
                if (itemsStock[productId].stock > 0) {
                    itemsStock[productId].stock -= 1;

                    // Update stock in the database
                    try {
                        await db.updateItemStock(productId, itemsStock[productId].stock);
                    } catch (err) {
                        console.error("Error updating stock in database:", err);
                    }

                    // Broadcast updated stock
                    fetchAndBroadcastStock();
                } else {
                    socket.emit('stock-error', { message: `Stock for product ${productId} is unavailable.` });
                }
            } else {
                socket.emit('stock-error', { message: `Product ${productId} not found.` });
            }
        });

        socket.on('disconnect', () => {
            console.log(`Client disconnected: ${socket.id}`);
        });
    });

    // Return the fetchAndBroadcastStock function for external use
    return {
        fetchAndBroadcastStock,
    };
};
