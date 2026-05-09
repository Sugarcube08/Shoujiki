FROM python:3.13-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    build-essential \
    util-linux \
    bubblewrap \
    && rm -rf /var/lib/apt/lists/*

# Create a non-root user
RUN useradd -m sandboxuser
WORKDIR /home/sandboxuser/app

# Pre-create data directory in home to ensure ownership
RUN mkdir -p /home/sandboxuser/app/agent_data && chown -R sandboxuser:sandboxuser /home/sandboxuser/app

# Install Python requirements
COPY --chown=sandboxuser:sandboxuser requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy source code with correct ownership
COPY --chown=sandboxuser:sandboxuser . .

USER sandboxuser

# Sandbox runs on 8001
CMD ["python3", "-m", "uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8001"]
