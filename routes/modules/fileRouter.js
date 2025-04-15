const express = require("express");
const multer = require("multer"); //对post传递的文件进行解析
const path = require("path");
const fs = require("fs").promises; // 使用 Promise 版本的 fs（进行异步文件处理）
const { auth } = require("../utils/jwt");
const { Database } = require("../utils/mysql");

// 模拟文件存储目录
const UPLOADS_DIR = path.join(__dirname, "../resource/original_3D");
const router = express.Router();

// 根据时间和初始文件名字生成唯一文件名
const generateFileName = (originalName) => {
  const timestamp = Date.now();
  const ext = path.extname(originalName);
  return `${timestamp}${ext}`;
};

// 配置 multer 存储路径（使用异步处理）
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      // 检查目录是否存在，不存在则创建
      await fs.access(UPLOADS_DIR);
    } catch (err) {
      await fs.mkdir(UPLOADS_DIR, { recursive: true }); // 递归创建目录
    }
    cb(null, UPLOADS_DIR);
  },
  filename: (req, file, cb) => {
    const fileName = generateFileName(file.originalname);
    cb(null, fileName);
  },
});

// 文件类型校验
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "stl",
    "STL",
    "obj",
    "fbx",
    "dae",
    "glb",
    "gltf",
    "3ds",
    "max",
    "mtl",
    "3mf",
  ];
  const ext = path.extname(file.originalname).toLowerCase().slice(1);
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("文件类型不支持"), false);
  }
};

// 初始化 multer 中间件
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 最大 10MB
  fileFilter,
});

// 批量插入文件记录到数据库
async function insertUploadedFiles(uploadedFiles) {
  try {
    const sql = `
      INSERT INTO file (file_name, phone,size)
      VALUES ${uploadedFiles.map(() => "(?, ?,?)").join(", ")}
    `;
    const values = uploadedFiles.flatMap((f) => [
      f.filename,
      f.phone.phone,
      f.size,
    ]);
    const result = await Database.query(sql, values);
    console.log("批量插入成功:", result);
    return result;
  } catch (error) {
    console.error("批量插入失败:", error);
    throw error;
  }
}

// 文件上传路由
//使用auth中间件
router.post("/upload", upload.array("files"), auth, async (req, res) => {
  try {
    const files = req.files;
    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "未上传任何文件" });
    }

    const uploadedFiles = files.map((file) => ({
      filename: file.filename,
      path: file.path,
      size: (file.size / 1024).toFixed(2), //MB为单位
      phone: req.user.phone,
    }));

    // 等待数据库插入完成
    await insertUploadedFiles(uploadedFiles);

    res.json({
      success: true,
      message: "文件上传成功",
      // files: uploadedFiles,//看自己选择，这里我是想看都含有什么信息
    });
  } catch (error) {
    console.error("文件上传失败:", error.message);
    if (error instanceof multer.MulterError) {
      res.status(400).json({ success: false, message: error.message });
    } else {
      res.status(500).json({ success: false, message: "服务器错误" });
    }
  }
});

// 获取文件列表
router.get("/files", auth, async (req, res) => {
  try {
    if (!req.user.a) {
      return res.status(401).json({ success: false, message: "你是谁" });
    }

    const rows = await Database.query(
      "SELECT file_name, phone, date,count FROM file ORDER BY date DESC"
    );
    res.json({ files: rows, message: "文件列表获取成功", success: true });
  } catch (err) {
    res
      .status(500)
      .json({ message: "意外错误: " + err.message, success: false });
  }
});

// 下载文件
router.get("/download/:filename", auth, async (req, res) => {
  try {
    if (!req.user.a) {
      return res.status(401).json({ success: false, message: "你是谁" });
    }

    const filename = req.params.filename;
    const filePath = path.join(UPLOADS_DIR, filename);

    try {
      // 异步检查文件是否存在
      await fs.access(filePath);
    } catch (err) {
      // 文件不存在时尝试删除数据库记录
      try {
        const [result] = await Database.query(
          "DELETE FROM file WHERE file_name = ?",
          [filename]
        );
        console.log(result.affectedRows === 1 ? "删除成功" : "删除失败");
      } catch (dbErr) {
        console.error("数据库删除失败:", dbErr);
      }
      return res.status(404).json({
        success: false,
        message: "文件不存在，已尝试清除异常数据",
      });
    }

    // 异步发送文件
    res.download(filePath, filename, async (err) => {
      if (err) {
        console.error("文件下载失败:", err);
        return res
          .status(500)
          .json({ success: false, message: "文件下载失败" });
      }

      // 更新下载计数
      try {
        await Database.query(
          "UPDATE file SET count = count + 1 WHERE file_name = ?",
          [filename]
        );
      } catch (dbErr) {
        console.error("更新下载计数失败:", dbErr);
      }
    });
  } catch (err) {
    res
      .status(500)
      .json({ message: "意外错误: " + err.message, success: false });
  }
});

module.exports = router;
