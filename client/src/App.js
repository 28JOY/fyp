import React, { Component } from "react";
import "./App.css";
import Pusher from "pusher-js"; 
import { Link } from "react-router-dom";

const API_URL = "http://localhost:9000/api/products";
const PUSHER_APP_KEY = "b33f1b0ed24e39eb346e";
const PUSHER_APP_CLUSTER = "ap2";

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {
      products: [],
      filteredProducts: [],
      categories: ["All", "Sportswear", "Casual", "Formal", "Athleisure", "Fitness"],
      selectedCategory: "All",
      lowStockProducts: [],
      selectedTestProduct: "", // Store selected product for testing
      testSellQuantity: 1, // Allow selecting quantity
      logs: [], // Store system logs for UI display
    };
  }

  componentDidMount() {
    this.fetchProducts();

    this.pusher = new Pusher(PUSHER_APP_KEY, { cluster: PUSHER_APP_CLUSTER, encrypted: true });
    this.channel = this.pusher.subscribe("products");

    this.channel.bind("updated", (updatedProduct) => {
      if (!updatedProduct || (!updatedProduct._id && !updatedProduct.id)) return; // ✅ Ensures a valid ID exists
      const productId = updatedProduct._id || updatedProduct.id; // ✅ Handles both formats
    
      this.setState((prevState) => {
        const updatedProducts = prevState.products.map((p) =>
          p._id === productId 
            ? { ...p, stock_quantity: updatedProduct.stock_quantity, restock_status: "approved", pending_restock: 0 } 
            : p
        );

        // Check if the updated product is now low on stock
        const isLowStock = updatedProduct.stock_quantity < 25;
        const lowStockExists = prevState.lowStockProducts.some((p) => p._id === productId);
    
        return {
          products: updatedProducts,
          filteredProducts: updatedProducts, // ✅ Ensures filtered products update
          lowStockProducts: isLowStock
            ? lowStockExists
              ? prevState.lowStockProducts
              : [...prevState.lowStockProducts, updatedProduct]
            : prevState.lowStockProducts.filter((p) => p._id !== productId),
          logs: [
            ...prevState.logs,
            `🛒 Product Sold: ${updatedProduct.name}, Remaining Stock: ${updatedProduct.stock_quantity}`,
          ],
        };
      });
    });       

    this.channel.bind("low-stock", (alertProduct) => {
      console.log("⚠ Received low-stock alert:", alertProduct);
      this.setState((prevState) => {
        const alreadyExists = prevState.lowStockProducts.some((p) => p._id === alertProduct._id);
        if (alreadyExists) return null; // Prevent duplicates
    
        return {
          lowStockProducts: [...prevState.lowStockProducts, alertProduct],
          logs: [...prevState.logs, `⚠ Low Stock Alert: ${alertProduct.name} is running low!`],
        };
      });
    }); 
    
  this.channel.bind("restocked", (restockedProduct) => {
    if (!restockedProduct || (!restockedProduct._id && !restockedProduct.id)) return;
    const productId = restockedProduct._id || restockedProduct.id; // ✅ Handles both formats
  
    this.setState((prevState) => {
      const updatedProducts = prevState.products.map((p) =>
        p._id === productId 
          ? { ...p, stock_quantity: restockedProduct.stock_quantity, restock_status: "approved", pending_restock: 0 } 
          : p
      );
  
      return {
        products: updatedProducts,
        filteredProducts: updatedProducts,
        lowStockProducts: updatedProducts.filter((p) => p.stock_quantity < 25),
        logs: [
          ...prevState.logs,
          `✅ Warehouse Restock Approved: ${restockedProduct.name}, New Stock: ${restockedProduct.stock_quantity}`
        ],
      };
    });
  });  

  }

  componentWillUnmount() {
    if (this.channel) {
      this.channel.unbind_all();  // ✅ Unbind all events
      this.channel.unsubscribe(); // ✅ Unsubscribe from Pusher channel
    }
    if (this.pusher) {
      this.pusher.disconnect(); // ✅ Fully disconnect Pusher to free resources
    }
  }  

  fetchProducts = () => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        const lowStockItems = data.filter((product) => product.stock_quantity < 25);
        const logs = [...this.state.logs];
        lowStockItems.forEach((p) => logs.push(`⚠ Low Stock Alert: ${p.name} is running low!`));

        const updatedProducts = data.map((p) => ({ ...p }));

        this.setState({
          products: updatedProducts,
          filteredProducts: updatedProducts,
          lowStockProducts: lowStockItems,
          logs,
        });
      })
      .catch((err) => {
        console.error("❌ Error fetching products:", err);
        alert("⚠ Unable to load products. Please check your server connection.");
        this.setState({
          logs: [...this.state.logs, "❌ Failed to fetch products. Check server."],
        });
      });
  }; 
    
  handleCategoryChange = (e) => {
    const selectedCategory = e.target.value;
    this.setState({
      selectedCategory,
      filteredProducts: 
      selectedCategory === "All"
        ? this.state.products
        : this.state.products.filter((product) => product.category === selectedCategory),
    });
  };

  restockProduct = (productId, amount) => {
    if (!amount || amount <= 0) {
      alert("Please enter a valid restock amount.");
      return;
    }

    const product = this.state.products.find((p) => p._id === productId);
    if (!product) {
      alert("❌ Error: Product not found in the inventory.");
      return;
    }

    fetch(`${API_URL}/restock`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId, amount: parseInt(amount, 10) }),
    })
      .then((res) => res.json())
      .then((data) => {
        this.setState((prevState) => ({
          lowStockProducts: prevState.lowStockProducts.map((p) =>
            p._id === productId ? { ...p, restockRequested: true } : p
          ),
          logs: [...prevState.logs, `🔄 Restock Requested: ${amount} units for ${product.name}. Waiting for approval...`],
        }));
        alert(`Restock process started for ${product.name}. Approval in 15 seconds.`);
      })
      .catch((err) => console.error("❌ Error in restocking:", err));
  }; 

  handleTestProductChange = (e) => {
    this.setState({ selectedTestProduct: e.target.value });
  };

  handleTestSellQuantityChange = (e) => {
    this.setState({ testSellQuantity: e.target.value });
  };

  sellTestProduct = () => {
    const { selectedTestProduct, testSellQuantity } = this.state;
    if (!selectedTestProduct) {
      alert("Please select a product to test selling.");
      return;
    }
  
    const selectedProduct = this.state.products.find((p) => p._id === selectedTestProduct);
    if (!selectedProduct) {
      alert("Product not found.");
      return;
    }
  
    fetch(`${API_URL}/sell`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: selectedTestProduct, quantity: parseInt(testSellQuantity, 10) }),
    })
      .then((res) => res.json())
      .then((data) => {
        this.setState((prevState) => {
          const updatedProducts = prevState.products.map((p) =>
            p._id === selectedTestProduct ? { ...p, stock_quantity: p.stock_quantity - testSellQuantity } : p
          );

          // Immediately update lowStockProducts
          const lowStockItems = updatedProducts.filter((p) => p.stock_quantity < 25);
          const isLowStockNow = lowStockItems.some((p) => p._id === selectedTestProduct);
  
          return {
            products: updatedProducts,
            filteredProducts: updatedProducts,
            lowStockProducts: isLowStockNow // ✅ Ensures UI updates without refresh
            ? [...prevState.lowStockProducts, selectedProduct]
              : prevState.lowStockProducts,
            logs: [...prevState.logs, `🛠 Test Sell: ${testSellQuantity} units of ${selectedProduct.name} sold.`],
          };
        });
      })
      .catch((err) => console.error("Error selling product:", err));
  };  
   

  render() {
    return (
      <div className="container">
        <h1 className="header">
        <span role="img" aria-label="box">📦</span> Product Inventory
          </h1>

      <div className="dashboard-container">
          <Link to="/dashboard">
            <button className="dashboard-btn">
              <span role="img" aria-label="bar chart">📊</span> View Dashboard
            </button>
          </Link>
      </div>    

        {/* Filter Dropdown */}
        <div className="filter-container">
        <label>
        <span role="img" aria-label="search">🔍</span> Filter by Category:
        </label>
          <select onChange={this.handleCategoryChange} value={this.state.selectedCategory}>
            {this.state.categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Product Grid */}
        <div className="product-grid">
          {this.state.filteredProducts.map((product) => (
            <div key={product._id} className={`product-card ${product.stock_quantity < 25 ? "low-stock" : ""} ${product.stock_quantity === 0 ? "out-of-stock" : ""}`}>
              <img src={product.image} alt={product.name} className="product-image" />
              <div className="product-info">
                <h3>{product.name}</h3>
                <p><b>Brand:</b> {product.brand}</p>
                <p><b>Price:</b> ₹{product.price}</p>
                <p><b>Stock:</b> {product.stock_quantity}</p>
                <p><b>Category:</b> {product.category}</p>
                {product.stock_quantity === 0 && <p className="stock-warning">🚫 Out of Stock</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Manual Sell for Testing Section */}
        <div className="test-sell-container">
          <h2>🛠 Sell a Product for Testing</h2>
          <select onChange={this.handleTestProductChange} value={this.state.selectedTestProduct}>
            <option value="">Select a Product</option>
            {this.state.products.map((product) => (
          <option 
            key={product._id} 
            value={product._id} 
            disabled={product.stock_quantity === 0}
          >
            {product.name} ({product.stock_quantity} in stock)
            {product.stock_quantity === 0 ? " - Out of Stock" : ""}
          </option>
        ))}
          </select>
          <input
            type="number"
            min="1"
            value={this.state.testSellQuantity}
            onChange={this.handleTestSellQuantityChange}
            className="test-sell-quantity"
          />
          <button className="test-sell-btn" onClick={this.sellTestProduct}>Sell for Testing</button>
        </div>

        {/* Low Stock Alerts & Restocking UI */}
        {this.state.lowStockProducts.length > 0 && (
          <div className="alert-box">
            <h2>
            <span role="img" aria-label="warning">⚠</span> Low Stock Alert!
            </h2>
            {this.state.lowStockProducts.map((product, index) => {
          if (!product._id) return null; // Prevents rendering invalid products
          return (
            <div key={product._id || `lowStock-${index}`} className="low-stock-item">
              <p>
              <b>{product.name}</b> is running low!
              {product.restockRequested ? " ⏳ Restock requested, waiting for approval..." : ""}
              </p>
              <input
                type="number"
                min="1"
                placeholder="Enter restock amount"
                value={this.state[`restock_${product._id}`] || ""}
                onChange={(e) => {
                  const value = e.target.value;
                  this.setState((prevState) => ({
                    ...prevState,
                    [`restock_${product._id}`]: value,
                  }));
                }}
              />
      <button 
        className="restock-btn"
        onClick={() => {
          const restockAmount = parseInt(this.state[`restock_${product._id}`], 10);
          if (restockAmount > 0) {
            this.restockProduct(product._id, restockAmount);
          } else {
            alert("Enter a valid restock amount!");
          }
        }}
      >
        ✅ Restock {product.name}
      </button>
    </div>
  );
})}
  </div>
)}
        {/* System Logs */}
        <div className="log-section">
          <h2>
            <span role="img" aria-label="document"></span>📜 System Logs</h2>
          <div className="log-box">
            {this.state.logs.map((log, index) => (
              <p key={index}>{log}</p>
            ))}
          </div>
        </div>
      </div>
    );
  }
}

export default App;
