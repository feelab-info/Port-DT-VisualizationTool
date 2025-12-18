import logging

import uvicorn
from fastapi import FastAPI

from config import setup_logging
from routes import router

setup_logging()

logger = logging.getLogger(__name__)

app = FastAPI(title="pvlib-fastapi")

app.include_router(router)


@app.get("/health")
def health() -> dict:
    logger.info("Health check")
    return {"status": "ok"}


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info",
    )
