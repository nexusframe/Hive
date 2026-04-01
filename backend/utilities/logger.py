import os
import logging
import sys
from datetime import datetime, timezone


class UTCFormatter(logging.Formatter):
    def formatTime(self, record, datefmt=None):
        ct = datetime.fromtimestamp(record.created, timezone.utc)
        if datefmt:
            if "%f" in datefmt:
                micro = ct.strftime("%f")
                milli = micro[:3]
                s = ct.strftime(datefmt.replace("%f", milli))
            else:
                s = ct.strftime(datefmt)
        else:
            s = ct.isoformat()
        return s


def get_logger(name, level=None):
    """
    Retrieve a logger with the given name. The logger's level is determined as follows:
      - If 'level' is provided, that is used.
      - Otherwise, the environment variable 'LOG_LEVEL' is read.
      - If 'LOG_LEVEL' is not set, default to WARNING.
    """
    if level is None:
        level_str = os.getenv("LOG_LEVEL", "WARNING").upper()
        try:
            level = getattr(logging, level_str)
        except AttributeError:
            level = logging.WARNING
    logger = logging.getLogger(name)
    logger.setLevel(level)
    if not logger.handlers:
        handler = logging.StreamHandler(sys.stdout)
        formatter = UTCFormatter(
            fmt="%(asctime)s %(levelname)s %(name)s %(message)s",
            datefmt="%Y-%m-%d %H:%M:%S.%f",  # Fixed: was %H:%M:%S:%M.%f (minutes duplicated)
        )
        handler.setFormatter(formatter)
        logger.addHandler(handler)
    return logger
