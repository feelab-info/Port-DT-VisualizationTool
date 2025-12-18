import logging

from fastapi import APIRouter

from schemas import (
    PVSystemConfigRequest,
    PowerSeriesRequest,
    PowerSeriesResponse,
    PVSystemStatusResponse,
)
from pvlib_service import (
    configure_pv_system,
    calculate_power_series,
    get_pv_system_status,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/pv-system", tags=["PV System"])


@router.post("/configure")
def configure_pv_system_endpoint(req: PVSystemConfigRequest) -> dict:
    logger.info("Configuring PV system")
    return configure_pv_system(req)


@router.get("/status", response_model=PVSystemStatusResponse)
def pv_system_status():
    logger.info("Fetching PV system status")
    return get_pv_system_status()


@router.post("/power-series", response_model=PowerSeriesResponse)
def power_series_endpoint(req: PowerSeriesRequest):
    logger.info("Calculating power series")
    return calculate_power_series(req)
