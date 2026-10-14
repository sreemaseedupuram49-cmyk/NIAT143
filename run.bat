@echo off
echo ========================================================
echo               FoodLink Prototype Starter
echo    Reducing Food Waste in Communities (Hackathon 2026)
echo ========================================================
echo.
echo Initializing database...
python database.py
echo.
echo Starting Web Server on http://localhost:5000 ...
echo Open your browser and navigate to: http://127.0.0.1:5000
echo.
python app.py
pause
