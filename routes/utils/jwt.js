//这个项目使用jwt进行token验证
//目前的token包含用户手机号和身份标识
const jwt = require("jsonwebtoken");
const jwt_secret = process.env.ACCESS_TOKEN_SECRET;
const jwt_date = process.env.ACCESS_TOKEN_EXPIRATION;



//验证使用的中间件
const auth = (req, res, next) => {
  //读取前端发送的token
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) {
    return res
      .status(401)
      .json({ message: "访问受限，凭证失效", success: false });
  }
  try {
    const decoded = jwt.verify(token, jwt_secret);
    //将token中的手机号和身份标识保存在req.user中
    req.user = {
      phone: decoded.phone,
      a: decoded.a,
    };
    next(); //释放
  } catch (err) {
    res.status(401).json({ message: "凭证校验出现问题", success: false });
  }
};


//这里选择使用两套的token生成逻辑，因为两者使用的都不多，这样方便使用
// 生成 用户的 Access Token
async function generateAccessToken(phone) {
  return new Promise((resolve, reject) => {
    jwt.sign(
      {
        phone,//用户身份证
        a: false,//身份标识
      },
      jwt_secret,
      { expiresIn: jwt_date },//过期时间
      (err, token) => {
        if (err) return reject(err);
        resolve(token);
      }
    );
  });
}

//生成管理员token
async function generateAdminToken(phone) {
  return new Promise((resolve, reject) => {
    jwt.sign(
      {
        phone,
        a: true,
      },
      jwt_secret,
      { expiresIn: process.env.ACCESS_TOKEN_ADMIN },
      (err, token) => {
        if (err) return reject(err);
        resolve(token);
      }
    );
  });
}

module.exports = {
  auth,
  generateAccessToken,
  generateAdminToken,
};
