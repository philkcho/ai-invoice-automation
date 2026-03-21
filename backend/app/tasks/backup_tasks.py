"""
Backup & Monitoring Celery Tasks

DB/Media/Config backup, rotation, health check, disk monitoring.
Replaces Windows Task Scheduler shell scripts with Celery Beat tasks.
"""
import logging
import os
import shutil
import socket
import subprocess
import tarfile
from datetime import datetime
from pathlib import Path

from app.core.config import settings
from app.tasks.celery_app import celery_app

logger = logging.getLogger(__name__)


# ── Telegram Alert Utility ─────────────────────────────────────

def send_telegram(level: str, message: str):
    """Send Telegram notification (CRITICAL/WARNING/INFO)."""
    emojis = {"CRITICAL": "\U0001f534", "WARNING": "\U0001f7e1", "INFO": "\U0001f7e2"}
    emoji = emojis.get(level, "\u26aa")
    hostname = socket.gethostname()
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    formatted = (
        f"{emoji} *[{level}] Invoice System*\n"
        f"Host: `{hostname}`\n"
        f"Time: `{timestamp}`\n\n"
        f"{message}"
    )

    if settings.TELEGRAM_BOT_TOKEN and settings.TELEGRAM_CHAT_ID:
        try:
            import urllib.parse
            import urllib.request

            params = urllib.parse.urlencode({
                "chat_id": settings.TELEGRAM_CHAT_ID,
                "text": formatted,
                "parse_mode": "Markdown",
            })
            url = f"https://api.telegram.org/bot{settings.TELEGRAM_BOT_TOKEN}/sendMessage?{params}"
            req = urllib.request.Request(url, method="GET")
            urllib.request.urlopen(req, timeout=10)
        except Exception as e:
            logger.warning("Failed to send Telegram alert: %s", e)
    else:
        logger.info("[%s] %s (Telegram not configured)", level, message)


# ── (a) Database Backup — Daily 03:00 KST ─────────────────────

@celery_app.task(name="app.tasks.backup_tasks.backup_database")
def backup_database():
    """PostgreSQL automatic backup (daily/weekly/monthly + rotation)."""
    backup_dir = Path(settings.BACKUP_DIR) / "db"
    daily_dir = backup_dir / "daily"
    weekly_dir = backup_dir / "weekly"
    monthly_dir = backup_dir / "monthly"

    for d in [daily_dir, weekly_dir, monthly_dir]:
        d.mkdir(parents=True, exist_ok=True)

    now = datetime.now()
    timestamp = now.strftime("%Y%m%d_%H%M%S")
    db_name = os.environ.get("POSTGRES_DB", "invoice_db")
    db_user = os.environ.get("POSTGRES_USER", "invoice_user")
    db_host = os.environ.get("POSTGRES_HOST", "db")
    db_port = os.environ.get("POSTGRES_PORT", "5432")

    daily_file = daily_dir / f"{db_name}_daily_{timestamp}.dump"

    # 1. pg_dump
    logger.info("Starting DB backup: %s", daily_file)
    try:
        with open(str(daily_file), "wb") as dump_file:
            result = subprocess.run(
                [
                    "pg_dump",
                    f"--host={db_host}",
                    f"--port={db_port}",
                    f"--username={db_user}",
                    f"--dbname={db_name}",
                    "--format=custom",
                ],
                stdout=dump_file,
                stderr=subprocess.PIPE,
                timeout=600,
                env={**os.environ, "PGPASSWORD": os.environ.get("POSTGRES_PASSWORD", "")},
            )
        if result.returncode != 0:
            raise RuntimeError(f"pg_dump failed: {result.stderr.decode()}")
    except Exception as e:
        daily_file.unlink(missing_ok=True)
        send_telegram("CRITICAL", f"DB backup failed: {e}")
        raise

    file_size = _human_size(daily_file.stat().st_size)
    logger.info("Daily backup completed: %s (%s)", daily_file.name, file_size)

    # 2. Verify backup
    verified = True
    try:
        verify_result = subprocess.run(
            ["pg_restore", "--list", str(daily_file)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.PIPE,
            timeout=60,
        )
        if verify_result.returncode != 0:
            verified = False
            send_telegram("WARNING", f"DB backup verification failed: {daily_file.name}")
    except Exception:
        verified = False

    # 3. Weekly copy (Sunday = 6 in weekday())
    if now.weekday() == 6:
        weekly_file = weekly_dir / f"{db_name}_weekly_{timestamp}.dump"
        shutil.copy2(str(daily_file), str(weekly_file))
        logger.info("Weekly backup created: %s", weekly_file.name)

    # 4. Monthly copy (1st day)
    if now.day == 1:
        monthly_file = monthly_dir / f"{db_name}_monthly_{timestamp}.dump"
        shutil.copy2(str(daily_file), str(monthly_file))
        logger.info("Monthly backup created: %s", monthly_file.name)

    send_telegram("INFO", f"DB backup completed: {file_size}" + (" (verification passed)" if verified else " (verification FAILED)"))
    return {"file": str(daily_file), "size": file_size, "verified": verified}


# ── (b) Media Backup — Daily 03:30 KST ────────────────────────

@celery_app.task(name="app.tasks.backup_tasks.backup_media")
def backup_media():
    """Media files backup (tar.gz)."""
    media_dir = Path("/app/media")
    backup_dir = Path(settings.BACKUP_DIR) / "media"
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"media_{timestamp}.tar.gz"

    if not media_dir.exists() or not any(media_dir.iterdir()):
        logger.info("Media directory is empty, skipping backup")
        send_telegram("INFO", "Media backup skipped: no files to back up")
        return {"file": None, "size": "0B", "skipped": True}

    logger.info("Starting media backup: %s", backup_file)
    try:
        with tarfile.open(str(backup_file), "w:gz") as tar:
            tar.add(str(media_dir), arcname=".")
    except Exception as e:
        backup_file.unlink(missing_ok=True)
        send_telegram("CRITICAL", f"Media backup failed: {e}")
        raise

    file_size = _human_size(backup_file.stat().st_size)
    logger.info("Media backup completed: %s (%s)", backup_file.name, file_size)
    send_telegram("INFO", f"Media backup completed: {file_size}")
    return {"file": str(backup_file), "size": file_size}


# ── (c) Rotate Backups — Daily 04:00 KST ──────────────────────

@celery_app.task(name="app.tasks.backup_tasks.rotate_backups")
def rotate_backups():
    """Delete old backups (daily 7, weekly 4, monthly 3, media 7, config 5)."""
    backup_dir = Path(settings.BACKUP_DIR)
    rotation_config = [
        (backup_dir / "db" / "daily", 7, "DB daily"),
        (backup_dir / "db" / "weekly", 4, "DB weekly"),
        (backup_dir / "db" / "monthly", 3, "DB monthly"),
        (backup_dir / "media", 7, "Media"),
        (backup_dir / "config", 5, "Config"),
    ]

    total_deleted = 0
    for directory, keep, label in rotation_config:
        deleted = _rotate_directory(directory, keep, label)
        total_deleted += deleted

    logger.info("Backup rotation completed: %d files deleted", total_deleted)
    return {"deleted": total_deleted}


def _rotate_directory(directory: Path, keep: int, label: str) -> int:
    """Delete oldest files in directory, keeping only `keep` newest."""
    if not directory.exists():
        return 0

    files = sorted(directory.iterdir(), key=lambda f: f.stat().st_mtime)
    files = [f for f in files if f.is_file()]

    if len(files) <= keep:
        logger.info("%s: %d files (within limit of %d)", label, len(files), keep)
        return 0

    to_delete = files[: len(files) - keep]
    for f in to_delete:
        logger.info("Deleting old backup: %s/%s", label, f.name)
        f.unlink()

    logger.info("%s: deleted %d, kept %d", label, len(to_delete), keep)
    return len(to_delete)


# ── (d) Health Check — Every 5 minutes ─────────────────────────

@celery_app.task(name="app.tasks.backup_tasks.health_check_all")
def health_check_all():
    """System-wide health check (DB + Redis)."""
    errors = []

    # 1. Database check
    try:
        from sqlalchemy import create_engine, text
        sync_engine = create_engine(settings.DATABASE_URL_SYNC, pool_pre_ping=True)
        with sync_engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        sync_engine.dispose()
        logger.debug("Health check: DB OK")
    except Exception as e:
        errors.append(f"Database: {e}")
        logger.error("Health check: DB FAILED - %s", e)

    # 2. Redis check
    try:
        import redis
        r = redis.from_url(settings.REDIS_URL, socket_timeout=5)
        r.ping()
        logger.debug("Health check: Redis OK")
    except Exception as e:
        errors.append(f"Redis: {e}")
        logger.error("Health check: Redis FAILED - %s", e)

    # 3. Alert on failure
    if errors:
        error_msg = "Health check FAILED:\n" + "\n".join(f"- {e}" for e in errors)
        send_telegram("CRITICAL", error_msg)
        return {"status": "unhealthy", "errors": errors}

    return {"status": "healthy"}


# ── (e) Disk Monitor — Every hour ──────────────────────────────

@celery_app.task(name="app.tasks.backup_tasks.monitor_disk")
def monitor_disk():
    """Monitor disk usage (85% WARNING, 95% CRITICAL)."""
    results = []

    for path in ["/", "/backups", "/app/media"]:
        try:
            usage = shutil.disk_usage(path)
        except OSError:
            continue

        percent = (usage.used / usage.total) * 100
        free_gb = usage.free / (1024 ** 3)
        entry = {"path": path, "usage_percent": round(percent, 1), "free_gb": round(free_gb, 1)}
        results.append(entry)

        if percent >= 95:
            send_telegram("CRITICAL", f"Disk CRITICAL: {path} at {percent:.1f}% (free: {free_gb:.1f}GB)")
        elif percent >= 85:
            send_telegram("WARNING", f"Disk WARNING: {path} at {percent:.1f}% (free: {free_gb:.1f}GB)")
        else:
            logger.info("Disk OK: %s at %.1f%% (free: %.1fGB)", path, percent, free_gb)

    return results


# ── (f) Config Backup — Weekly Sunday 04:00 KST ───────────────

@celery_app.task(name="app.tasks.backup_tasks.backup_config")
def backup_config():
    """Configuration files backup (tar.gz)."""
    backup_dir = Path(settings.BACKUP_DIR) / "config"
    backup_dir.mkdir(parents=True, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = backup_dir / f"config_{timestamp}.tar.gz"

    # Collect config files from /app (the project root inside container)
    app_dir = Path("/app")
    config_files = []

    # .env files
    for f in app_dir.parent.glob(".env*"):
        if f.is_file():
            config_files.append(f)
    # Also check /app itself for mounted .env files
    for f in app_dir.glob(".env*"):
        if f.is_file():
            config_files.append(f)

    # docker-compose.yml (may not be inside container, but try)
    compose_file = app_dir / "docker-compose.yml"
    if compose_file.exists():
        config_files.append(compose_file)

    # credentials directory
    cred_dir = app_dir / "credentials"

    if not config_files and not cred_dir.exists():
        logger.info("No config files found to back up")
        send_telegram("INFO", "Config backup skipped: no config files found")
        return {"file": None, "skipped": True}

    logger.info("Starting config backup: %s", backup_file)
    try:
        with tarfile.open(str(backup_file), "w:gz") as tar:
            for f in config_files:
                tar.add(str(f), arcname=f.name)
            if cred_dir.exists():
                tar.add(str(cred_dir), arcname="credentials")
    except Exception as e:
        backup_file.unlink(missing_ok=True)
        send_telegram("CRITICAL", f"Config backup failed: {e}")
        raise

    file_size = _human_size(backup_file.stat().st_size)
    logger.info("Config backup completed: %s (%s)", backup_file.name, file_size)
    send_telegram("INFO", f"Config backup completed: {file_size}")
    return {"file": str(backup_file), "size": file_size}


# ── Utility ────────────────────────────────────────────────────

def _human_size(size_bytes: int) -> str:
    """Convert bytes to human-readable string."""
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.1f}{unit}"
        size_bytes /= 1024
    return f"{size_bytes:.1f}TB"
