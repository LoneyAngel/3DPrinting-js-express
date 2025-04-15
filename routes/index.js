const user = require("./modules/userRouter");
const file = require("./modules/fileRouter");
const admin = require("./modules/adminRouter");

module.exports = (app) => {
  app.use("/user", user).use("/file", file).use("/admin", admin);
};
