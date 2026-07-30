FROM python:3.11-slim

ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gfortran libopenblas-dev liblapack-dev pkg-config && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /opt/app
COPY backend/requirements.txt ./backend/requirements.txt

RUN pip install --upgrade pip setuptools wheel
RUN pip install -r backend/requirements.txt

COPY . .

EXPOSE 10000
CMD ["uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "10000"]
