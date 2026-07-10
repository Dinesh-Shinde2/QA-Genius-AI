# Use the official Microsoft Playwright image as it contains Python, Chromium, and all system libraries
FROM mcr.microsoft.com/playwright/python:v1.44.0-jammy

# Install Tesseract OCR and system libraries
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    libtesseract-dev \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy requirements file first to utilize Docker build cache
COPY backend/requirements.txt ./backend/requirements.txt

# Install python packages
RUN pip install --no-cache-dir -r ./backend/requirements.txt

# Copy all source files
COPY . .

# Expose FastAPI port
EXPOSE 8000

# Start command (Render injects $PORT automatically)
CMD uvicorn backend.main:app --host 0.0.0.0 --port ${PORT:-8000}
