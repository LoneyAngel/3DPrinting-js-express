require("dotenv").config({ path: "./.env" }); //启动环境变量
const express = require("express"); //引入express
const https = require("https");
const fs = require("fs"); // 文件操作库fs
const routes = require("./routes"); //引入路由文件
const cors = require("cors"); //进行跨域的配置
const bodyParser = require("body-parser"); // 配置中间件以解析 JSON 格式的请求体

const app = express();
const port = process.env.PORT;
const a = process.env.Pempath;
const b = process.env.Keypath;

//启动声明
console.log("当前环境：", port);
console.log("时间：", new Date().toLocaleString());

// 中间件配置
app
  .use(cors())
  .use(express.json())
  .use(bodyParser.json())
  .use(bodyParser.urlencoded({ extended: true })) //启用表单解析，注意如果测试的话，不要使用from-data,使用raw或者表单模式
  .use((err, req, res, next) => {
    //错误处理
    console.error(err.stack);
    const statusCode = err.status || 500;
    const message = err.message || "Internal Server Error";

    res.status(statusCode).json({
      success: false,
      error: {
        message,
        code: statusCode,
      },
    });
  });

// 创建 HTTPS 服务器
const options = {
  key: fs.readFileSync(b),
  cert: fs.readFileSync(a),
};

https.createServer(options, app).listen(port, () => {
  console.log(`HTTPS server is running at https://stalabwork.xin:${port}`);
});

// 路由注册
routes(app);

// 404 处理
app.get("*", (req, res) => {
  global.logger.error(`404 Not Found: ${req.originalUrl}`);
  res.status(404).json({ message: "404 Not Found" });
});
