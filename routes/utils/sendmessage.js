//这里接入阿里云短信服务
//如果不需要的话，可以自己修改实现的逻辑，或者使用固定的验证码进行测试
//或者修改成邮箱验证的方式
const Dysmsapi20170525 = require("@alicloud/dysmsapi20170525");
const OpenApi = require("@alicloud/openapi-client");
const Util = require("@alicloud/tea-util");
const accessKeyId = process.env.KEYID;
const secretAccessKey = process.env.SECRET;
const signName = process.env.SIGNNAME;
const templateCode = process.env.TEMPLATECODE;

// 初始化客户端
const createClient = (accessKeyId, accessKeySecret) => {
  const config = new OpenApi.Config({
    accessKeyId: accessKeyId, // 替换为你的 AccessKey ID
    accessKeySecret: accessKeySecret, // 替换为你的 AccessKey Secret
  });
  config.endpoint = "dysmsapi.aliyuncs.com"; // 阿里云短信服务端点
  return new Dysmsapi20170525.default(config);
};

//生成随机的验证码
//直接使用random生成验证码的方法可能会出问题，这里采用的安全方法
function generateNumericCode(length = 6) {
  const min = Math.pow(10, length - 1);
  const max = Math.pow(10, length) - 1;
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// 发送短信函数，注意这里返回的是json数据
const sendSmsMessage = async (phone) => {
  const formattedPhone = `+86${phone}`; // 注意：格式化为 +8613800001111
  const verify = generateNumericCode();
  const client = createClient(accessKeyId, secretAccessKey);
  const sendRequest = new Dysmsapi20170525.SendSmsRequest({
    phoneNumbers: formattedPhone, // 手机号格式：+8613800001111（带国际区号）
    signName: signName, // 审核通过的签名名称
    templateCode: templateCode, // 审核通过的模板CODE
    templateParam: `{"code":'${verify}'}`, // 模板参数，格式为JSON字符串，例如：{"code":"1234"}
  });

  try {
    const response = await client.sendSmsWithOptions(
      sendRequest,
      new Util.RuntimeOptions({})
    );
    return {
      success: response.body.code === "OK", //阿里云发送成功时返回的code是"OK"
      message: verify,
    };
  } catch (error) {
    console.error("阿里云短信发送失败:", error);
    return { success: false, message: error.message };
  }
};

module.exports = {
  sendSmsMessage,
};

//测试代码
// 使用示例：发送验证码
// sendSmsMessage("17602351272").then((result) => {
//   if (result.success) {
//     console.log("短信发送成功！");
//   } else {
//     console.error("发送失败:", result.message);
//   }
// });
