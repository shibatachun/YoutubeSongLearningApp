@echo off
setlocal
chcp 65001 >nul

REM === 端口按你的项目配置改 ===
set SERVER_PORT=5173
set CLIENT_PORT=5174

REM === 根目录 ===
set ROOT=%~dp0

REM === 启动 Server ===
start "Server" cmd /k "cd /d "%ROOT%Server" && npm run dev"

REM === 启动 Client ===
start "Client" cmd /k "cd /d "%ROOT%Client" && npm run dev"

REM === 给 Vite 几秒钟启动时间（不够可改大一些） ===
timeout /t 5 >nul

REM === 打开浏览器 ===
start "" "http://localhost:%CLIENT_PORT%/"

endlocal