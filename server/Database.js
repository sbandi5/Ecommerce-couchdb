// CouchDB Connection Setup
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const nano = require('nano')(process.env.COUCHDB_URL);
const ecommerceDb = nano.db.use('ecommerce');

class Database {
    static #instance = null;

    constructor() {
        if (Database.#instance) {
            throw new Error('Use Database.getInstance() instead of new.');
        }
    }

    static getInstance() {
        if (!Database.#instance) {
            Database.#instance = new Database();
        }
        return Database.#instance;
    }

    // Create new user
    async updateNewUser(user) {
        const checkUser = await ecommerceDb.get(user.Email).catch(() => null);
        if (checkUser) {
            throw new Error('User already exists');
        }

        const userDoc = {
            _id: user.Email,
            type: "user",
            fname: user.Fname,
            lname: user.Lname,
            username: user.Username,
            password: user.Password,
            phone: user.Phone,
            address: {
                aptAddress: user.AptAddress,
                street: user.Street,
                city: user.City,
                state: user.State,
                areaCode: user.AreaCode
            },
            role: user.role || "user",
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        return ecommerceDb.insert(userDoc);
    }

    // Get user by email
    async getuserDetails(email) {
        const userDetails = await ecommerceDb.get(email).catch(() => {
            throw new Error('User not found');
        });
        return userDetails;
    }

    // Update user
    async updateUser(user, _id) {
        const existing = await ecommerceDb.get(_id).catch(() => {
            throw new Error('User not found');
        });

        // Update only the necessary fields
        existing.fname = user.Fname || existing.fname;
        existing.lname = user.Lname || existing.lname;
        existing.email = user.Email || existing.email;
        existing.username = user.Username || existing.username;
        existing.password = user.Password || existing.password;
        existing.phone = user.Phone || existing.phone;

        existing.address = {
            aptAddress: user.AptAddress || existing.address?.aptAddress,
            street: user.Street || existing.address?.street,
            city: user.City || existing.address?.city,
            state: user.State || existing.address?.state,
            areaCode: user.AreaCode || existing.address?.areaCode,
        };

        existing.updated_at = new Date().toISOString();

        // Pass the full updated doc with _id and _rev
        return ecommerceDb.insert(existing);
    }


    // Get user by username
    async getuserDetailsbyUsername(username) {
        const result = await ecommerceDb.find({
            selector: {
                type: "user",
                username: username
            },
            fields: [
                "_id", "fname", "lname", "email", "username", "phone",
                "address.aptAddress", "address.street", "address.city", "address.state", "address.areaCode"
            ],
            limit: 1
        });

        if (result.docs.length === 0) {
            throw new Error('User not found by username');
        }

        return result.docs[0];
    }

    // Check stock quantity of a product by _id
    async checkQuantity(itemId) {
        const item = await ecommerceDb.get(itemId).catch(() => {
            throw new Error('Item not found');
        });

        return item.Stock > 0;
    }

    // Update stock of an item
    async updateItemStock(itemId, newStock) {
        const item = await ecommerceDb.get(itemId).catch(() => {
            throw new Error('Item not found');
        });

        item.Stock = newStock;
        item.updated_at = new Date().toISOString();
        return ecommerceDb.insert(item);
    }

    async addItemToCart(userId, itemId) {
        // 1. Find active cart with exact userId match
        const result = await ecommerceDb.find({
            selector: {
                type: 'cart',
                userId: { "$eq": userId },  // Ensure exact match
                status: 'active'
            },
            limit: 1
        });
        console.log("The User Id:", userId); // Debugging line
        let cart;
        if (result.docs.length > 0) {
            cart = result.docs[0];
        } else {
            // Create new cart with specific userId
            cart = {
                _id: uuidv4(),
                type: 'cart',
                userId: userId,  // Ensure userId is set correctly
                status: 'active',
                items: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };
        }

        // Check if item already in cart
        const existing = cart.items.find(i => i.itemId === itemId);
        if (existing) {
            existing.quantity += 1;
        } else {
            // Get price from item
            const item = await ecommerceDb.get(itemId);
            cart.items.push({
                itemId,
                quantity: 1,
                price: item.Price
            });
        }

        cart.updated_at = new Date().toISOString();
        return ecommerceDb.insert(cart);
    }
    async getActiveCart(user_Id) {
        const result = await ecommerceDb.find({
            selector: {
                type: 'cart',
                userId: user_Id,
                status: 'active'
            },
            limit: 1
        });
        if (result.docs.length === 0) return null;
        const cart = result.docs[0];
        return cart;
    }
    async getCartItems(userId) {
        const result = await ecommerceDb.find({
            selector: {
                type: 'cart',
                userId,
                status: 'active'
            },
            limit: 1
        });

        if (result.docs.length === 0) return [];

        const cart = result.docs[0];
        const detailedItems = [];

        for (const item of cart.items) {
            const product = await ecommerceDb.get(item.itemId);
            const images = await ecommerceDb.find({
                selector: {
                    type: 'image',
                    productName: product.Name
                }
            });

            detailedItems.push({
                ...item,
                name: product.Name,
                description: product.Description,
                imageURLs: images.docs.map(img => img.ImageURL)
            });
        }

        return detailedItems;
    }
    async insertOrderItems(orderId, cartItems) {
        const orderItemDocs = cartItems.map(item => ({
            _id: uuidv4(),
            type: 'order_item',
            OrderID: orderId,
            ItemID: item.ItemID,
            Quantity: item.Quantity,
            Price: item.Price,
            created_at: new Date().toISOString()
        }));
        return ecommerceDb.bulk({ docs: orderItemDocs });
    }
    async removeItemFromCart(userId, itemId) {
        const result = await ecommerceDb.find({
            selector: {
                type: 'cart',
                userId,
                status: 'active'
            },
            limit: 1
        });

        if (result.docs.length === 0) {
            throw new Error('Active cart not found');
        }

        const cart = result.docs[0];
        cart.items = cart.items.filter(i => i.itemId !== itemId);
        cart.updated_at = new Date().toISOString();
        return ecommerceDb.insert(cart);
    }

    async markCartAsCheckedOut(user_Id) {
        const result = await ecommerceDb.find({
            selector: {
                type: 'cart',
                userId: user_Id,
                status: 'active'
            },
            limit: 1
        });

        if (result.docs.length === 0) return null;

        const cart = result.docs[0];
        cart.status = 'checkout';
        cart.updated_at = new Date().toISOString();
        return ecommerceDb.insert(cart);
    }

    async insertImages(productName, imageUrls) {
        const bulkDocs = imageUrls.map(url => ({
            _id: uuidv4(),
            type: "image",
            productName,
            ImageURL: url,
            created_at: new Date().toISOString()
        }));

        return ecommerceDb.bulk({ docs: bulkDocs });
    }

    async insertOrder(user_Id, cartItems, totalAmount) {
        const orderDoc = {
            _id: uuidv4(),
            type: 'order',
            userId: user_Id,
            items: cartItems,
            totalAmount,
            status: 'success',
            created_at: new Date().toISOString()
        };
        await ecommerceDb.insert(orderDoc);
        console.log('Order inserted:', orderDoc);
        return orderDoc;
    }

    async getOrderedItemsByUserId(user_Id) {
        const result = await ecommerceDb.find({
            selector: {
                type: 'order',
                userId: user_Id
            },
            //sort: [{ created_at: 'desc' }]
        });
        if (result.docs.length === 0) return [];
        console.log('Ordered items:', result.docs);
        const detailedOrders = [];
        for (const order of result.docs) {
            const itemsWithDetails = [];

            if (!Array.isArray(order.items)) {
                console.log('Order has no items array:', order);
                continue;
            }

            for (const item of order.items) {
                const product = await ecommerceDb.get(item.itemId);
                const images = await ecommerceDb.find({
                    selector: { type: 'image', productName: product.Name }
                });

                itemsWithDetails.push({
                    ...item,
                    name: product.Name,
                    description: product.Description,
                    type: product.Type,
                    price: product.Price,
                    imageURLs: images.docs.map(i => i.ImageURL)
                });
            }

            detailedOrders.push({
                orderId: order._id,
                created_at: order.created_at,
                totalAmount: order.totalAmount,
                items: itemsWithDetails
            });
        }

        return detailedOrders;
    }

    async insertItem(item) {
        try {
            const itemId = uuidv4();

            const itemDoc = {
                _id: itemId,
                type: 'item',
                Name: item.Name,
                Description: item.Description,
                Price: item.Price,
                Stock: item.Stock,
                Category: "Footwear",
                Type: item.Type,
                UserName: item.UserName,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            await ecommerceDb.insert(itemDoc);

            // Insert associated images (if any)
            if (item.itemPhotos && item.itemPhotos.length > 0) {
                const imageDocs = item.itemPhotos.map(photo => ({
                    _id: uuidv4(),
                    type: 'image',
                    productId: itemId,
                    productName: item.Name,
                    ImageURL: photo,
                    created_at: new Date().toISOString()
                }));

                await ecommerceDb.bulk({ docs: imageDocs });
                console.log('Images inserted for item');
            }

            return { message: "Item inserted successfully", itemId };
        } catch (err) {
            console.error('Error inserting item:', err);
            throw err;
        }
    }

    async checkIfItemInCart(userId, itemId) {
        const result = await ecommerceDb.find({
            selector: {
                type: 'cart',
                userId,
                status: 'active'
            },
            limit: 1
        });

        if (result.docs.length === 0) return false;

        const cart = result.docs[0];
        return cart.items.some(i => i.itemId === itemId);
    }

    async updateCartQuantity(cartId, itemId, quantity) {
        const result = await ecommerceDb.find({
            selector: {
                type: 'cart',
                _id: cartId,
                status: 'active'
            },
            limit: 1
        });

        if (!result.docs || result.docs.length === 0) {
            throw new Error('Cart not found');
        }

        const cart = result.docs[0];
        cart.items = cart.items.map(item => {
            if (item.itemId === itemId) {
                return { ...item, quantity };
            }
            return item;
        });

        return ecommerceDb.insert(cart);
    }

    async getItemStock(itemId) {
        const item = await ecommerceDb.get(itemId).catch(() => null);
        return item ? item.Stock : null;
    }

    async reduceStock(cartItems) {
        try {
            const updates = [];

            for (const cartItem of cartItems) {
                const item = await ecommerceDb.get(cartItem.itemId);
                if (item.Stock >= cartItem.quantity) {
                    item.Stock -= cartItem.quantity;
                    item.updated_at = new Date().toISOString();
                    updates.push(item);
                } else {
                    throw new Error(`Insufficient stock for ${item.Name}`);
                }
            }

            return ecommerceDb.bulk({ docs: updates });
        } catch (err) {
            console.error('Error reducing stock:', err);
            throw err;
        }
    }

    async getItemsStockByUsername(username) {
        const result = await ecommerceDb.find({
            selector: {
                type: 'item',
                UserName: username
            }
        });

        const mergedItems = [];

        for (const item of result.docs) {
            const images = await ecommerceDb.find({
                selector: {
                    type: 'image',
                    productId: item._id
                }
            });

            mergedItems.push({
                ...item,
                ImageURLs: images.docs.map(img => img.ImageURL)
            });
        }

        return mergedItems;
    }

    async getItemsStock() {
        const result = await ecommerceDb.find({
            selector: {
                type: 'item'
            }
        });

        const allItems = [];

        for (const item of result.docs) {
            const images = await ecommerceDb.find({
                selector: {
                    type: 'image',
                    productId: item._id
                }
            });

            allItems.push({
                ...item,
                ImageURLs: images.docs.length > 0 ? images.docs.map(i => i.ImageURL) : ['path/to/default-image.jpg']
            });
        }

        return allItems;
    }

    async getorderDetailsbyOrderID(orderID) {
        const order = await ecommerceDb.get(orderID).catch(() => {
            throw new Error('Order not found');
        });

        const details = [];

        for (const item of order.items) {
            const product = await ecommerceDb.get(item.itemId);
            details.push({
                ...item,
                Name: product.Name,
                Description: product.Description,
                Price: product.Price,
                Type: product.Type
            });
        }

        return details;
    }

    async getSenderEmailByItemID(itemId) {
        const item = await ecommerceDb.get(itemId).catch(() => {
            throw new Error('Item not found');
        });

        const result = await ecommerceDb.find({
            selector: {
                type: 'user',
                username: item.UserName
            },
            limit: 1
        });

        if (result.docs.length === 0) throw new Error('User not found');

        const user = result.docs[0];
        return {
            fname: user.fname,
            lname: user.lname,
            email: user.email,
            phone: user.phone,
            ...user.address
        };
    }


}

module.exports = Database;
