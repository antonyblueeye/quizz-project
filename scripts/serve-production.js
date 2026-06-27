// Production server for local play via tunnel (stable chunks + Socket.io)
process.env.NODE_ENV = "production";
require("../server.js");
