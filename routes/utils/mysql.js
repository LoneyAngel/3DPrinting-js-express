const mysql = require("mysql2/promise");

// 创建连接池
const pool = mysql.createPool({
  host: process.env.DB_HOST, // 数据库主机地址，从环境变量中读取
  user: process.env.DB_USER, // 数据库用户名，从环境变量中读取
  port: process.env.DB_PORT, // 数据库端口号，从环境变量中读取
  password: process.env.DB_PASSWORD, // 数据库密码，从环境变量中读取
  database: process.env.DB_NAME, // 数据库名称，从环境变量中读取
  connectionLimit: 10, // 连接池中最大连接数
  waitForConnections: true, // 当连接池耗尽时，是否等待空闲连接
  queueLimit: 0, // 等待队列的最大长度，0 表示不限制，正常不建议是0
});

//对方法进行封装
class Database {
  /**
   * 执行单条 SQL 查询
   * @param {string} sql - 要执行的 SQL 语句
   * @param {Array} params - SQL 语句中的参数（用于防止 SQL 注入）
   * @returns {Promise<Array>} - 返回查询结果的行数据
   */
  static async query(sql, params = []) {
    try {
      // 使用连接池执行 SQL 查询
      const [rows] = await pool.execute(sql, params);

      // 打印调试信息：SQL 语句、参数和查询结果
      console.log("单次查询具体信息：");
      console.log(sql); // 打印 SQL 语句
      console.log(params); // 打印参数
      console.log("查询结果:", rows); // 打印查询结果

      return rows; // 返回查询结果
    } catch (err) {
      // 捕获并抛出自定义错误信息
      throw new Error(`Database error: ${err.message}`);
    }
  }

  /**
   * 执行事务操作
   * @param {Array<Object>} queries - 包含多个查询的对象数组，每个对象包含 sql 和 params
   * @example
   * [
   *   { sql: "INSERT INTO table1 (col1) VALUES (?)", params: [value1] },
   *   { sql: "UPDATE table2 SET col2 = ? WHERE id = ?", params: [value2, id] }
   * ]
   */
  static async transaction(queries) {
    // 从连接池中获取一个独立的连接
    const connection = await pool.getConnection();
    try {
      // 开始事务
      await connection.beginTransaction();

      // 遍历并依次执行每个查询
      for (const { sql, params } of queries) {
        await connection.execute(sql, params); // 执行 SQL 语句
      }

      // 提交事务
      await connection.commit();
    } catch (err) {
      // 如果发生错误，回滚事务
      await connection.rollback();
      throw new Error(`Transaction failed: ${err.message}`);
    } finally {
      // 无论成功或失败，释放连接回连接池
      connection.release();
    }
  }
}

// 导出 Database 类
module.exports = {
  Database,
};
