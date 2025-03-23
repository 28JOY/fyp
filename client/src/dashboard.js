import React, { useEffect, useState } from "react";
import "./App.css";
import Pusher from "pusher-js";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { useHistory } from "react-router-dom";

const API_URL = "http://localhost:9000/api/products";
const PUSHER_APP_KEY = "b33f1b0ed24e39eb346e";
const PUSHER_APP_CLUSTER = "ap2";

const Dashboard = () => {
  const [products, setProducts] = useState([]);
  const [logs, setLogs] = useState(() => {
    const saved = localStorage.getItem("inventory_logs");
    return saved ? JSON.parse(saved) : [];
  });

  const history = useHistory();

  // Utility to add log and save it to localStorage
  const addLog = (message) => {
    setLogs((prevLogs) => {
      const updated = [...prevLogs, message];
      localStorage.setItem("inventory_logs", JSON.stringify(updated));
      return updated;
    });
  };

  useEffect(() => {
    fetch(API_URL)
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        const initialLogs = data
          .filter((p) => p.stock_quantity < 25)
          .map((p) => `⚠ Low Stock Alert: ${p.name} is running low!`);
          initialLogs.forEach((log) => addLog(log));
      });

    const pusher = new Pusher(PUSHER_APP_KEY, {
      cluster: PUSHER_APP_CLUSTER,
      encrypted: true,
    });

    const channel = pusher.subscribe("products");

    channel.bind("updated", (updatedProduct) => {
      if (!updatedProduct) return;
      setProducts((prevProducts) =>
        prevProducts.map((p) =>
          p._id === updatedProduct.id
            ? { ...p, stock_quantity: updatedProduct.stock_quantity }
            : p
        )
      );
      addLog(`🛒 Product Sold: ${updatedProduct.name}, Remaining Stock: ${updatedProduct.stock_quantity}`);
    });

    channel.bind("low-stock", (alertProduct) => {
      if (!alertProduct) return;
      addLog(`⚠ Low Stock Alert: ${alertProduct.name} is running low!`);
    });

    channel.bind("restocked", (restockedProduct) => {
      if (!restockedProduct) return;
      addLog(`✅ Warehouse Restock Approved: ${restockedProduct.name}, New Stock: ${restockedProduct.stock_quantity}`);
    });

    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
    };
  }, []);

  const lowStockCount = products.filter((p) => p.stock_quantity < 25).length;
  const outOfStockCount = products.filter((p) => p.stock_quantity === 0).length;
  const restockApproved = products.filter((p) => p.restock_status === "approved").length;
  const restockPending = products.filter((p) => p.restock_status === "pending").length;

  return (
    <div className="container">
      <h1 className="header">
        <span role="img" aria-label="bar chart">📊</span> Inventory Dashboard
        </h1>

        <div className="dashboard-container">
        <button className="back-btn" onClick={() => history.push("/")}>
          <span role="img" aria-label="left arrow">←</span> Back to Inventory
        </button>

        {/* Summary Cards */}
        <div className="product-grid">
          <div className="product-card" style={{ borderTop: "5px solid #17a2b8" }}>
          <h2><span role="img" aria-label="box">📦</span> {products.length}</h2>
            <p>Total Products</p>
          </div>
          <div className="product-card" style={{ borderTop: "5px solid #dc3545" }}>
          <h2><span role="img" aria-label="warning">⚠️</span> {lowStockCount}</h2>
            <p>Low Stock Items</p>
          </div>
          <div className="product-card" style={{ borderTop: "5px solid #28a745" }}>
          <h2><span role="img" aria-label="checkmark">✅</span> {restockApproved}</h2>
            <p>Restocks Approved</p>
          </div>
          <div className="product-card" style={{ borderTop: "5px solid #fd7e14" }}>
          <h2><span role="img" aria-label="hourglass">⏳</span> {restockPending}</h2>
            <p>Restocks Pending</p>
          </div>
        </div>

        {/* Bar Chart */}
        <div style={{ marginTop: "40px", width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <BarChart data={products}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis />
              <Tooltip />
              <Bar
                dataKey="stock_quantity"
                fill="#007bff"
                radius={[5, 5, 0, 0]}
                label={{ position: "top", fontSize: 10 }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Log Section */}
        <div className="log-section">
        <h2><span role="img" aria-label="scroll">📜</span> Live System Logs</h2>
          <div className="log-box">
            {logs.map((log, index) => (
              <p key={index}>{log}</p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
