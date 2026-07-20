@echo off
chcp 65001 >nul
echo 正在准备开发环境...
call npm rebuild better-sqlite3 --silent 2>nul
echo 启动 AI Agent 后端...
node src/index.js
pause
