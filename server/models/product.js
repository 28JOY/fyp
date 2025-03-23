const mongoose = require("mongoose");

// ✅ Define Product Schema (Matching Your MongoDB Structure)
const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  brand: { type: String },
  color: { type: String },
  size: { type: String },
  price: { type: Number, required: true },
  category: { type: String },
  material: { type: String },
  stock_quantity: { type: Number, required: true, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  pending_restock: { type: Number, default: 0 }, // ✅ Track unapproved restocks
  restock_status: { type: String, enum: ["pending", "approved", "denied"], default: null } // ✅ Restock state
}, { collection: "products" }); // ✅ Explicitly set collection name

// ✅ Update `updated_at` before saving
productSchema.pre("save", function (next) {
    this.updated_at = Date.now();
    next();
});

// ✅ Create Product Model
const Product = mongoose.model("Product", productSchema);

module.exports = Product;
