from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class PVSystemConfigRequest(BaseModel):
    latitude: float
    longitude: float
    timezone: str = Field("UTC", description="IANA timezone")

    surface_tilt: float
    surface_azimuth: float

    module_power_kw: float = Field(..., gt=0)


class PowerSeriesRequest(BaseModel):
    date: datetime = Field(
        ...,
        description="Reference datetime for the power series",
    )

    interval_hours: int = Field(
        24,
        gt=0,
        le=24,
        description="Total duration in hours (max 24)",
    )

    sampling_minutes: int = Field(
        15,
        gt=0,
        le=60,
        description="Sampling interval in minutes (max 60)",
    )

    start_at_midnight: bool = Field(
        True,
        description="If true, start the series at 00:00 of the given date",
    )

    @field_validator("sampling_minutes")
    @classmethod
    def validate_sampling(cls, v: int) -> int:
        allowed = {1, 5, 15, 30, 60}
        if v not in allowed:
            raise ValueError(f"sampling_minutes must be one of {sorted(allowed)}")
        return v


class PowerSeriesResponse(BaseModel):
    times: list[datetime]
    power_kw: list[float]


class PVSystemStatusResponse(BaseModel):
    latitude: float
    longitude: float
    timezone: str
    surface_tilt: float
    surface_azimuth: float
    module_power_kw: float
