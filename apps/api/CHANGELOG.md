# Changelog

本文件记录项目所有 notable 变更，格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，
版本号遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

## [Unreleased]

### Added

- 项目初始化，基于 NestJS v11 + TypeScript 脚手架
- 环境配置管理（@nestjs/config + Joi 校验）
- 全局异常过滤器，统一错误响应格式
- 全局响应拦截器，统一成功响应格式
- 全局 ValidationPipe，启用 DTO 自动校验
- Swagger/OpenAPI 接口文档（/api-docs）
- 健康检查端点（/health）
- Docker 多阶段构建支持
- CI/CD GitHub Actions 流水线
- Husky + lint-staged 提交前自动检查
- commitlint 约定式提交规范
- EditorConfig 跨编辑器格式统一
- .nvmrc 锁定 Node.js 版本
