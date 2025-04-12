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
    async updateUser(user, email) {
        const existing = await ecommerceDb.get(email).catch(() => {
            throw new Error('User not found');
        });

        const updatedUser = {
            ...existing,
            fname: user.Fname,
            lname: user.Lname,
            email: user.Email,
            username: user.Username || existing.username,
            password: user.Password,
            phone: user.Phone,
            address: {
                aptAddress: user.AptAddress,
                street: user.Street,
                city: user.City,
                state: user.State,
                areaCode: user.AreaCode
            },
            updated_at: new Date().toISOString()
        };

        return ecommerceDb.insert(updatedUser);
    }

    // Get user by username
    async getuserDetailsbyUsername(username) {
        const result = await ecommerceDb.find({
            selector: {
                type: "user",
                username: username
            },
            fields: [
                "fname", "lname", "email", "username", "phone",
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
        // 1. Find active cart
        const result = await ecommerceDb.find({
            selector: {
                type: 'cart',
                userId: userId,
                status: 'active'
            },
            limit: 1
        });
    
        let cart;
        if (result.docs.length > 0) {
            cart = result.docs[0];
        } else {
            // Create new cart
            cart = {
                _id: uuidv4(),
                type: 'cart',
                userId,
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
    
    async markCartAsCheckedOut(userId) {
        const result = await ecommerceDb.find({
            selector: {
                type: 'cart',
                userId,
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

    async insertOrder(userId, cartItems, totalAmount) {
        const orderDoc = {
            _id: uuidv4(),
            type: 'order',
            userId,
            items: cartItems,
            totalAmount,
            status: 'Pending',
            created_at: new Date().toISOString()
        };
    
        return ecommerceDb.insert(orderDoc);
    }

    async getOrderedItemsByUserId(userId) {
        const result = await ecommerceDb.find({
            selector: {
                type: 'order',
                userId
            },
            sort: [{ created_at: 'desc' }]
        });
    
        const detailedOrders = [];
        for (const order of result.docs) {
            const itemsWithDetails = [];
    
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
        const cart = await ecommerceDb.get(cartId).catch(() => {
            throw new Error('Cart not found');
        });
    
        const target = cart.items.find(i => i.itemId === itemId);
        if (!target) {
            throw new Error('Item not found in cart');
        }
    
        target.quantity = quantity;
        cart.updated_at = new Date().toISOString();
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
                const item = await ecommerceDb.get(cartItem.ItemID);
                if (item.Stock >= cartItem.Quantity) {
                    item.Stock -= cartItem.Quantity;
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
