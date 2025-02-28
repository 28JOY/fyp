const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");

// ✅ Import Product Model (Replace 'task' with your actual product model)
const Product = require("../models/product");

// ✅ API Route to Fetch Products
router.get("/products", async (req, res) => {
  try {
      console.log("📢 Connecting to MongoDB...");

      // ✅ Check Mongoose Connection
      if (mongoose.connection.readyState !== 1) {
          console.log("❌ MongoDB Not Connected");
          return res.status(500).json({ message: "Database connection error" });
      }

      // ✅ Fetch Products from MongoDB
      const products = await Product.find({});
      console.log("📢 Fetched Products:", products); // Debugging log

      res.json(products);
  } catch (err) {
      console.error("❌ Error fetching products:", err);
      res.status(500).json({ message: "Error fetching products", error: err });
  }
});

module.exports = router;

// ✅ API Route to Fetch Inventory Data
router.get("/inventory", async (req, res) => {
    try {
        const inventory = await Product.find({}, { name: 1, stock_quantity: 1 });
        res.json(inventory);
    } catch (err) {
        res.status(500).json({ message: "Error fetching inventory", error: err });
    }
});

// ✅ API Route to Sell a Product
router.post("/sell", async (req, res) => {
    try {
        const { product_id, quantity } = req.body;
        const product = await Product.findById(product_id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        if (product.stock_quantity < quantity) {
            return res.status(400).json({ message: "Not enough stock" });
        }

        product.stock_quantity -= quantity;
        await product.save();

        res.json({ message: "Product sold!", new_stock: product.stock_quantity });
    } catch (err) {
        res.status(500).json({ message: "Error selling product", error: err });
    }
});

// ✅ API Route to Restock a Product
router.post("/restock", async (req, res) => {
    try {
        const { product_id, quantity } = req.body;
        const product = await Product.findById(product_id);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        product.stock_quantity += quantity;
        await product.save();

        res.json({ message: "Product restocked!", new_stock: product.stock_quantity });
    } catch (err) {
        res.status(500).json({ message: "Error restocking product", error: err });
    }
});

// ✅ Export API Routes
module.exports = router;
