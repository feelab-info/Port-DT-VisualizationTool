import logging

import pandas as pd
import pvlib

from schemas import PVSystemConfigRequest, PowerSeriesRequest

logger = logging.getLogger(__name__)

# -------------------------------------------------------------------
# Default PV system (Funchal, Madeira)
# -------------------------------------------------------------------
_DEFAULT_PV_SYSTEM = PVSystemConfigRequest(
    latitude=32.641893,
    longitude=-16.908949,
    timezone="UTC",
    surface_tilt=30.0,
    surface_azimuth=180.0,  # South-facing
    module_power_kw=22.0,
)

# Mutable holder for the active PV system (no globals needed)
_PV_SYSTEM_STATE: dict[str, PVSystemConfigRequest] = {
    "active": _DEFAULT_PV_SYSTEM,
}


def configure_pv_system(req: PVSystemConfigRequest) -> dict:
    """
    Override the default PV system configuration.
    """
    logger.info("Overriding PV system configuration")

    _PV_SYSTEM_STATE["active"] = req

    return {
        "status": "configured",
        "timezone": req.timezone,
    }


def _get_active_system() -> PVSystemConfigRequest:
    return _PV_SYSTEM_STATE["active"]


def _normalize_start_datetime(
    start,
    timezone: str,
    start_at_midnight: bool,
) -> pd.Timestamp:
    """
    Normalize datetime to the system timezone.
    Handles naive and tz-aware inputs safely.
    """
    ts = pd.Timestamp(start)

    if start_at_midnight:
        ts = ts.normalize()

    if ts.tzinfo is None:
        return ts.tz_localize(timezone)

    return ts.tz_convert(timezone)


def _generate_times(req: PowerSeriesRequest) -> pd.DatetimeIndex:
    """
    Generate a timezone-aware datetime index.
    """
    system = _get_active_system()
    periods = int((req.interval_hours * 60) / req.sampling_minutes)

    start = _normalize_start_datetime(
        req.date,
        system.timezone,
        req.start_at_midnight,
    )

    return pd.date_range(
        start=start,
        periods=periods,
        freq=f"{req.sampling_minutes}min",
    )


def calculate_power_series(req: PowerSeriesRequest) -> dict:
    """
    Calculate DC power time series using pvlib clear-sky model.
    """
    system = _get_active_system()

    logger.info("Calculating power series")

    times = _generate_times(req)

    location = pvlib.location.Location(
        latitude=system.latitude,
        longitude=system.longitude,
        tz=system.timezone,
    )

    clearsky = location.get_clearsky(times)
    solar_position = location.get_solarposition(times)

    poa = pvlib.irradiance.get_total_irradiance(
        surface_tilt=system.surface_tilt,
        surface_azimuth=system.surface_azimuth,
        dni=clearsky["dni"],
        ghi=clearsky["ghi"],
        dhi=clearsky["dhi"],
        solar_zenith=solar_position["zenith"],
        solar_azimuth=solar_position["azimuth"],
    )

    power_kw = (poa["poa_global"] / 1000.0 * system.module_power_kw).clip(lower=0)

    logger.info("Power series calculation complete")

    return {
        "times": times.to_list(),
        "power_kw": power_kw.round(4).tolist(),
    }


def get_pv_system_status() -> dict:
    """
    Return the current active PV system configuration.
    """
    system = _get_active_system()

    return system.model_dump()
