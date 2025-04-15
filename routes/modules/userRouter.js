/*和用户数据库进行交互*/
const express = require("express");
const moment = require("moment-timezone"); //时间处理
const { sendSmsMessage } = require("../utils/sendmessage.js");
const { auth, generateAccessToken } = require("../utils/jwt.js");
const { Database } = require("../utils/mysql");
const router = express.Router();

//通用函数
async function getUserByPhone(phone) {
  try {
    const user = await Database.query(
      "SELECT * FROM user_information WHERE phone = ?", //？是占位符号
      [phone]
    );
    return user;
  } catch (err) {
    throw new Error("函数getUserByPhone意外报错");
  }
}
// 验证验证码是否有效,5min
function validateCaptcha(date) {
  try {
    const currentTime = moment().tz("Asia/Shanghai"); // 获取当前时间
    const createdAtMoment = moment.tz(
      date,
      "YYYY-MM-DD HH:mm:ss",
      "Asia/Shanghai"
    ); // 解析数据库中的时间

    // 判断验证码是否匹配且未过期
    const timeDifference = currentTime.diff(createdAtMoment, "minutes"); // 时间差（分钟）
    if (timeDifference <= 5) {
      console.log("Captcha is valid.");
      return true;
    } else if (timeDifference > 5) {
      console.error("过期的验证码");
      return false;
    } else {
      console.log("判断出现意外错误");
      return false;
    }
  } catch (error) {
    console.error("Error validating captcha:", error);
    return false;
  }
}
// 1min只允许发送一次，减少重复发送
function validatesend(date) {
  try {
    const currentTime = moment().tz("Asia/Shanghai"); // 获取当前时间
    const createdAtMoment = moment.tz(
      date,
      "YYYY-MM-DD HH:mm:ss",
      "Asia/Shanghai"
    ); // 解析数据库中的时间

    // 判断验证码是否匹配且未过期
    const timeDifference = currentTime.diff(createdAtMoment, "minutes"); // 时间差（分钟）
    if (timeDifference < 1) {
      console.log("1min只能发送一次");
      return false;
    } else return true;
  } catch (error) {
    console.error("Error validating captcha:", error);
    return false;
  }
}

//发送验证码
router.post("/get_verify", async (req, res) => {
  try {
    const { phone } = req.body;
    const _ = await getUserByPhone(phone);
    if (_.length) {
      let a1 = await validatesend(_[0].new_date); //抑制发送验证码的时间
      if (a1) {
        // let verify = await sendSmsMessage(phone); //获取验证码存入数据库
        let verify = 666667; //默认验证码进行测试
        if (verify.success) {
          let a = {
            sql: "UPDATE user_information SET verify = ?,new_date = NOW(),count = IF(new_date < DATE_SUB(NOW(), INTERVAL 1 MINUTE), 1, count + 1) WHERE phone = ?",
            params: [verify.message, phone],
          };
          let result = await Database.query(a.sql, a.params);
          if (result) {
            console.log("Data saved");
            res.status(201).send({
              message: "Data saved",
              success: true,
            });
          } else {
            res.status(500).json({
              message: "数据上传失败",
              success: false,
            });
          }
        } else {
          res.status(500).json({
            message: "验证码获取失败",
            success: false,
          });
        }
      } else {
        res.status(400).json({
          message: "请不要重复发送",
          success: false,
        });
      }
    } else {
      // let verify = await sendSmsMessage(phone); //获取验证码存入数据库
      let verify = 666667; //默认验证码进行测试
      if (verify.success) {
        let a = {
          sql: "INSERT INTO user_information (phone, verify,new_date,count) VALUES (?, ?,NOW(),1)",
          params: [phone, verify.message],
        };
        let result = await Database.query(a.sql, a.params);
        if (result) {
          console.log("新的用户诞生了！");
          res.status(201).send({
            message: "新的用户诞生了！",
            success: true,
          });
        } else {
          res.status(500).json({
            message: "数据上传失败",
            success: false,
          });
        }
      } else {
        res.status(500).json({
          message: "验证码获取失败",
          success: false,
        });
      }
    }
  } catch (err) {
    res.status(500).json({
      message: err.message,
      success: false,
    });
  }
});

//验证用户输入的验证码
router.post("/verify", async (req, res) => {
  try {
    // 从前端获取用户输入的验证码和手机号
    const { get_input, phone } = req.body;

    // 根据手机号查询用户信息
    const _ = await getUserByPhone(phone);

    // 验证验证码是否有效
    if (validateCaptcha(_[0].new_date)) {
      if (_[0].verify === get_input) {
        // 注意：token 生成过程不需要额外的 try-catch 处理
        const token = await generateAccessToken({ phone });
        res.json({
          token,
          success: true,
          message: "验证成功",
        });
      } else {
        // 验证码错误
        res.status(400).json({
          message: "验证码输入错误",
          success: false,
        });
      }
    } else {
      // 验证码过期或其他问题
      res.status(400).json({
        message: "可能是过期的验证码",
        success: false,
      });
    }
  } catch (err) {
    // 捕获意外错误
    res.status(500).json({
      message: "意外错误：" + err.message,
      success: false,
    });
  }
});

module.exports = router;
