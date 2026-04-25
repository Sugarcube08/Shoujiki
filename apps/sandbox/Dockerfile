FROM python:3.13-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    util-linux \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Create a non-root user
RUN useradd -m sandboxuser
RUN chown -R sandboxuser:sandboxuser /app

USER sandboxuser

COPY . .

# Sandbox runs on 8001
CMD ["python3", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
