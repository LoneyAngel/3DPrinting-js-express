/*
管理员部分
和用户部分相似
*/
const express = require("express");
const router = express.Router();
const { sendSmsMessage } = require("../utils/sendmessage.js");
const { auth, generateAdminToken } = require("../utils/jwt.js");
const { Database } = require("../utils/mysql");

// 通用函数通过手机号获取用户信息
async function getUserByPhone(phone) {
  try {
    const user = await Database.query(
      "SELECT * FROM admin WHERE phone = ?", //？是占位符号，使用字符串拼接的方法避免减少sql注入的风险
      [phone]
    );
    return user;
  } catch (err) {
    throw new Error("抱歉不是管理员");
  }
}

//根据手机号和密码登录
router.post("/login", async (req, res) => {
  try {
    const { phone, password } = req.body;
    console.log(phone);

    const _ = await getUserByPhone(phone);
    if (_.length) {
      if (_[0].password == password) {
        const token = await generateAdminToken({ phone });
        console.log(token);
        res.json({
          token: token,
          success: true,
          message: "验证成功",
        });
      } else {
        res.status(500).json({
          message: "密码错误",
          success: false,
        });
      }
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
});

//忘记密码，首先获取验证码，判断是不是管理者身份，判断成功则通过jwt赋予管理者身份许可
router.post("/get_verify", async (req, res) => {
  try {
    const { phone } = req.body;
    console.log(phone);
    const verify = await sendSmsMessage(phone); //获取验证码存入数据库
    // const verify = 555655;
    if (verify) {
      console.log(verify);
      const _ = await getUserByPhone(phone);
      let a;
      if (_.length) {
        a = {
          sql: "UPDATE admin SET verify = ? WHERE phone = ?",
          params: [verify, phone],
        };
      } else {
        res.status(500).json({
          message: "失败获取相关信息：" + err.message,
          success: false,
        });
      }
      const result = await Database.query(a.sql, a.params);
      if (result) {
        res.status(201).send({
          message: "成功",
          success: true,
        });
      } else {
        res.status(500).json({
          message: "失败",
          success: false,
        });
      }
    } else {
      res.status(500).json({ message: "验证码发送失败", success: false });
    }
  } catch (err) {
    res.status(500).json({ message: err.message, success: false });
  }
});

//验证输入的验证码是不是正确
router.post("/verify", async (req, res) => {
  try {
    //从前端获取用户输入的验证码和数据库进行对比
    const { get_input, phone } = req.body;
    const user = await getUserByPhone(phone);
    console.log(user.verify);
    console.log(get_input);

    if (user.length) {
      const result = user[0].verify == get_input;
      if (result) {
        res.json({
          success: true,
          message: "验证成功",
        });
      } else {
        res.status(500).json({
          message: "验证失败",
          success: false,
        });
      }
    } else {
      res.status(500).json({
        message: "验证失败" + err.message,
        success: false,
      });
    }
  } catch (err) {
    res.status(500).json({
      message: "意外错误" + err.message,
      success: false,
    });
  }
});

//修改管理者密码
router.post("/udpate", async (req, res) => {
  try {
    const { password, phone } = req.body;
    const _ = await getUserByPhone(phone);
    if (_.length) {
      const a = {
        sql: "UPDATE admin SET password = ? WHERE phone = ?",
        params: [password, phone],
      };
      const result = await Database.query(a.sql, a.params);
      if (result.affectedRows) {
        res.status(201).send({
          message: "成功",
          success: true,
        });
      } else {
        res.status(500).json({
          message: "失败：" + err.message,
          success: false,
        });
      }
    } else {
      res.status(500).json({
        message: "数据上传失败：" + err.message,
        success: false,
      });
    }
  } catch {
    res.status(500).json({
      message: "异常错误：" + err.message,
      success: false,
    });
  }
});

//注意最后把所有的路由暴漏出来
module.exports = router;
