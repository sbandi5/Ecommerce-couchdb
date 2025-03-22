// CouchDB Connection Setup
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const nano = require('nano')(process.env.COUCHDB_URL);
const ecommerceDb = nano.db.use('ecommerce');
// const usersDb = nano.db.use('users');
// const itemsDb = nano.db.use('items');
// const ordersDb = nano.db.use('orders');
// const cartDb = nano.db.use('cart');
// const imagesDb = nano.db.use('images');

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

    async updateNewUser(user) {
        const checkUser = await ecommerceDb.get(user.Email).catch(() => null);
        if (checkUser) {
            console.log(checkUser);
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

    async getuserDetails(email){
        const userDetails =await ecommerceDb.get(email).catch(() => {
            throw new Error('User not found');
        });
        console.log(userDetails);
        return userDetails;
    }

    // async createItem(item) {
    //     const itemDoc = {
    //         _id: `item_${item.name.replace(/\s+/g, '_').toLowerCase()}`,
    //         type: "item",
    //         name: item.name,
    //         description: item.description,
    //         price: item.price,
    //         stock: item.stock,
    //         category: item.category,
    //         itemType: item.type,
    //         createdAt: new Date().toISOString(),
    //         updatedAt: new Date().toISOString(),
    //         userName: item.userName
    //     };
    //     return itemsDb.insert(itemDoc);
    // }

    // async createImage(image) {
    //     const imageDoc = {
    //         _id: `image_${image.productName.replace(/\s+/g, '_').toLowerCase()}`,
    //         type: "image",
    //         productName: image.productName,
    //         imageURL: image.imageURL
    //     };
    //     return imagesDb.insert(imageDoc);
    // }

    // async createCart(userId) {
    //     const cartDoc = {
    //         _id: `cart_${userId}`,
    //         type: "cart",
    //         userId,
    //         items: [],
    //         status: "active"
    //     };
    //     return cartDb.insert(cartDoc);
    // }

    // async createOrder(order) {
    //     const orderDoc = {
    //         _id: `order_${order.userId}_${Date.now()}`,
    //         type: "order",
    //         userId: order.userId,
    //         totalAmount: order.totalAmount,
    //         status: "pending",
    //         items: order.items,
    //         createdAt: new Date().toISOString()
    //     };
    //     return ordersDb.insert(orderDoc);
    // }
}

module.exports = Database;
