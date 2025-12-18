import logging
import coloredlogs


def setup_logging() -> None:
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )

    coloredlogs.install(
        level=logging.INFO,
        fmt="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
