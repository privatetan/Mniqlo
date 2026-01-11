# Cron 自动启动说明

## 功能说明

当服务器启动或重启时，系统会自动执行以下操作：

1. **延迟启动**
   - 开发环境：延迟 5 秒
   - 生产环境：延迟 3 秒
   - 目的：确保数据库连接和其他依赖已完全初始化

2. **加载启用的调度**
   - 从数据库查询所有 `is_enabled = true` 的品类
   - 读取每个品类的 `cron_expression`
   - 自动创建并启动对应的 cron 任务

3. **日志输出**
   ```
   [01-11 23:53:15] [Cron] Auto-starting scheduler (development mode)...
   [01-11 23:53:15] [Cron] Starting crawler schedule manager...
   [01-11 23:53:15] [Cron] Loading 2 enabled schedule(s)...
   [01-11 23:53:15] [Cron] ✓ Scheduled job for 女装: */30 * * * *
   [01-11 23:53:15] [Cron] ✓ Scheduled job for 男装: 0 * * * *
   [01-11 23:53:15] [Cron] Crawler schedule manager started with 2 active job(s)
   [01-11 23:53:15] [Cron] ✓ Successfully loaded 2 enabled schedule(s): 女装, 男装
   ```

## 使用场景

### 场景 1: 首次启动
- 服务器启动
- 自动加载数据库中已启用的调度
- 开始按 cron 表达式执行任务

### 场景 2: 服务器重启
- 服务器重启（如代码更新、服务器维护）
- 自动恢复所有已启用的调度
- 无需手动重新配置

### 场景 3: 无启用调度
- 如果数据库中没有启用的调度
- 日志提示：`No enabled schedules found. Configure schedules in admin panel.`
- 等待用户在管理面板配置

## 动态管理

即使服务器已启动，仍可通过管理面板动态管理调度：

- **启用调度**: 立即创建并启动 cron 任务
- **禁用调度**: 立即停止并移除 cron 任务
- **修改间隔**: 立即更新 cron 表达式并重启任务

无需重启服务器！

## 验证方法

1. **查看控制台日志**
   - 启动服务器后查看日志输出
   - 确认看到 "Auto-starting scheduler" 消息
   - 确认看到已加载的品类列表

2. **检查数据库**
   ```sql
   SELECT gender, is_enabled, cron_expression 
   FROM crawler_schedules 
   WHERE is_enabled = true;
   ```

3. **观察执行**
   - 等待 cron 表达式指定的时间
   - 查看日志中的 "Executing scheduled crawl" 消息
   - 确认任务正常执行
