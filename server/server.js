const path = require("path");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const Pusher = require("pusher");
const Product = require("./models/product"); // Ensure correct path

const app = express();
const PORT = 9000;

const lowStockSent = {}; // Keeps track of products that have already received a low stock alert

// **Pusher Configuration for Real-time Updates**
const pusher = new Pusher({
  appId: "1939935",
  key: "b33f1b0ed24e39eb346e",
  secret: "84a18eb813710dde9a95",
  cluster: "ap2",
  useTLS: true,
});

// **Middleware**
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static images from the public folder
app.use("/images", express.static(path.join(__dirname, "../client/public/images")));

// **MongoDB Connection**
mongoose
  .connect("mongodb+srv://mongodb:mongodb@store-inventory-cluster.giztz.mongodb.net/store_inventory?retryWrites=true&w=majority&appName=store-inventory-cluster")
  .then(() => console.log("✅ Connected to MongoDB Atlas"))
  .catch((err) => {
    console.error("❌ MongoDB Connection Error:", err);
    process.exit(1); // Stops the server if DB connection fails
  });
async function restorePendingRestocks() {
  console.log("🔄 Checking for pending restocks...");

  const products = await Product.find({ pending_restock: { $gt: 0 } });
  products.forEach((product) => {
    console.log(`⏳ Resuming pending restock for ${product.name} - ${product.pending_restock} units`);
    warehouseRestockApproval(product._id, product.pending_restock);
  });
}

// Run this when the server starts
restorePendingRestocks();

  // **Automatic Selling Process - Runs Every 30 Mins**
async function autoSellProducts() {
  console.log("🔄 Fetching products for auto-selling...");

  const products = await Product.find({ stock_quantity: { $gt: 0 } });

  if (products.length === 0) {
    console.log("⚠ No products available for selling!");
    return;
  }

  const productToSell = products[Math.floor(Math.random() * products.length)];
  productToSell.stock_quantity--;

  console.log(`🛒 AUTO SOLD: ${productToSell.name}, Remaining Stock: ${productToSell.stock_quantity}`);

  await productToSell.save();
  console.log(`✅ SAVED: ${productToSell.name}, Stock: ${productToSell.stock_quantity}`);

  if (productToSell.stock_quantity < 25 && !lowStockSent[productToSell._id]) {
    console.log(`⚠ ALERT: ${productToSell.name} stock below 25! Restock approval pending.`);
    pusher.trigger("products", "low-stock", { 
       id: productToSell._id, 
       name: productToSell.name 
    });

    lowStockSent[productToSell._id] = true; // Mark alert as sent
 } 

  pusher.trigger("products", "updated", {
    id: productToSell._id,
    name: productToSell.name,  // ✅ Add product name
    stock_quantity: productToSell.stock_quantity,
 }); 
}

// **Trigger automatic selling every 30 seconds**
setInterval(async () => {
  console.log("⏳ Running automatic selling process...");
  try {
    await autoSellProducts();
  } catch (err) {
    console.error("❌ Error in auto-sell:", err);
  }
}, 30000); // 30 seconds

// **Warehouse Restocking Approval (15 mins buffer)**
const PendingRestocks = {}; // Temporary storage for pending restocks

async function warehouseRestockApproval(productId) {
  console.log(`⏳ Restock request received for ${productId}, waiting for approval...`);

  setTimeout(async () => {
    const product = await Product.findById(productId);
    if (product && product.pending_restock > 0) {
      const approvedAmount = product.pending_restock; // Approve the full amount
      product.stock_quantity += approvedAmount;
      product.pending_restock = 0;
      product.restock_status = "approved";
      await product.save();
      console.log(`✅ RESTOCKED: ${product.name} - New Stock: ${product.stock_quantity}`);

      pusher.trigger("products", "restocked", {
        id: product._id,
        name: product.name,
        stock_quantity: product.stock_quantity,
      });
    } else {
      console.log("❌ ERROR: Product not found or no pending restock!");
    }
  }, 15000); // ✅ Approval takes 15 seconds
}

// **Route: Get All Products with Image Mapping**
app.get("/api/products", async (req, res) => {
  const products = await Product.find();

  // check for low-stock items on start-up
  products.forEach(product => {
    if (product.stock_quantity < 25 && !lowStockSent[product._id]){
      console.log(`⚠ ALERT: ${product.name} stock below 25!`);
      pusher.trigger("products", "low-stock", {
        id: product._id,
        name: product.name
    });
    lowStockSent[product._id] = true; //Mark alert as sent
  }
});

  // Image Mapping based on product color
  const imageMap = {
    black: "/images/black.png",
    blue: "/images/blue.png",
    green: "/images/green.png",
    red: "/images/red.png",
    white: "/images/white.png",
  };

  // Attach image URL based on color field
  const productsWithImages = products.map((product) => {
    const color = product.color ? product.color.toLowerCase() : "white"; // Default to white if no color
    return {
      ...product._doc, // Spread existing product data
      image: imageMap[color] || "/images/white.png", // Assign image based on color
    };
  });

  res.json(productsWithImages);
});

// **Route: Manual Testing - Sell One Product**
app.post("/api/products/sell", async (req, res) => {
  const { productId, quantity } = req.body;  // Get quantity from request

  if (!mongoose.Types.ObjectId.isValid(productId)) {
    return res.status(400).json({ message: "Invalid product ID format!" });
  }

  const product = await Product.findById(productId);

  if (!product || product.stock_quantity <= 0) {
    return res.status(400).json({ message: "Product not available or out of stock!" });
  }

  const sellQuantity = Math.min(quantity || 1, product.stock_quantity); // Prevents over-selling
  product.stock_quantity -= sellQuantity;
  await product.save();
  console.log(`🛒 TEST SELL: ${sellQuantity} units of ${product.name}, Remaining Stock: ${product.stock_quantity}`);

  pusher.trigger("products", "updated", {
    id: product._id,
    name: product.name,
    stock_quantity: product.stock_quantity,
  });  

  // ✅ If stock falls below 25, trigger the low-stock event
  if (product.stock_quantity < 25 && !lowStockSent[product._id]) {
    console.log(`⚠ ALERT: ${product.name} stock below 25!`);
    pusher.trigger("products", "low-stock", { 
       id: product._id, 
       name: product.name 
    });
    lowStockSent[product._id] = true; // Mark alert as sent
  }

  res.json({ message: `Sold ${sellQuantity} units for testing!`, product });
});

// **Route: Approve Restock**
app.post("/api/products/restock", async (req, res) => {
  let { productId, amount } = req.body;

  if (!productId || !amount) {
    return res.status(400).json({ message: "Invalid restock request. Product ID and amount required." });
  }

  const product = await Product.findById(productId);
  if (!product) {
    return res.status(404).json({ message: "Product not found." });
  }

  product.pending_restock = amount;
  product.restock_status = "pending";
  await product.save();

  console.log(`✅ Restock request logged: ${amount} units for ${product.name}. Waiting for approval...`);
  warehouseRestockApproval(productId);

  res.json({ message: `Restock request pending for ${product.name}. Approval in 15 seconds.` });
});

// **Start Server**
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
