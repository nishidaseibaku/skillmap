# スキルマップアプリ起動スクリプト
Write-Host "=== SkillMap App 起動 ===" -ForegroundColor Cyan

# Firebase Emulator をバックグラウンドで起動
Write-Host "Firebase Emulator を起動中..." -ForegroundColor Yellow
$emulator = Start-Process -FilePath "firebase" -ArgumentList "emulators:start --only firestore" -PassThru -WindowStyle Minimized

Start-Sleep -Seconds 3

# Vite 開発サーバーを起動
Write-Host "Vite 開発サーバーを起動中..." -ForegroundColor Yellow
npm run dev
