# 项目介绍

3Dprinting 网站的后端部分
网址
stalabwork.xin
使用 js 的 express 作为后端架构，使用 token 进行用户验证

# 项目架构

- /app.js 项目入口文件
- .env 环境变量配置文件
- /routes

  - /index.js 一级路由
  - /modules 定义二级路由
  - /utils 开发常见的必要组件
  - /resource 资源存储路径

# 运行前须知

将.env 文件中的变量换成自己的
目前使用的是 http 模式，根据需要换成 https 模式

# 运行项目

npm install 安装所需的依赖包

npm run dev 运行开发版本

npm run start 运行生产版本

# 须知

- 注意自己把对应的环境变量换成自己的配置
