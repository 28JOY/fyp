## ⚠️ Attribution

This project is **based on an open-source repository by Esteban Herrera**.

🔗 Original repository: [https://github.com/eh3rrera/realtime-mongodb-pusher](https://github.com/eh3rrera/realtime-mongodb-pusher)  
🛠 Modified by **Jessica Joy** for academic purposes as part of a Final Year Project.  
✨ Enhancements include:
- Advanced low-stock alert system
- Automatic product selling simulation
- Warehouse restocking logic with approval delay
- Improved UI and test functionalities

This project retains the original MIT License.


## 📦 Real-Time Inventory Management System

A real-time inventory system that simulates stock depletion and restocking using MongoDB, Express, React, Node.js, and Pusher. This project helps visualize low stock alerts, auto-selling, and delayed restocking approvals with live UI updates.

## 🚀 Features

✅ Real-time stock updates using Pusher
⚠️ Low stock detection when quantity drops below 25 units
🛒 Auto-selling logic that randomly sells items at intervals
⏳ Restock approval with a 15-second simulated delay
🧪 Manual product testing via dropdown and quantity selector
🔔 Visual alerts for out-of-stock and low-stock products
📝 System log viewer for tracking all inventory events

## 🛠 Tech Stack

Frontend: React.js
Backend: Express.js, Node.js
Database: MongoDB Atlas
Real-time Events: Pusher

## 🖥️ Local Setup

# Prerequisites
Node.js & npm
MongoDB Atlas account

# Steps:
1. Clone the repository
git clone https://github.com/28JOY/fyp.git
cd fyp

2. Install dpeendencies
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install

3. Add your MongoDB URI and Pusher credentials Update the following in server.js:

mongoose.connect("YOUR_MONGODB_URI");

And update your Pusher keys:

const pusher = new Pusher({
  appId: "your-app-id",
  key: "your-key",
  secret: "your-secret",
  cluster: "your-cluster",
  useTLS: true,
});

4. Run the servers

# Start backend server
cd server
node server.js

# Start frontend React app
cd ../client
npm start
