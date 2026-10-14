FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
ENV PIP_DISABLE_PIP_VERSION_CHECK=1
RUN python -m pip install --no-cache-dir --retries 10 --timeout 120 --verbose -r requirements.txt

COPY . .

EXPOSE 8001

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001"]
