import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    DATABASE_URL: str = os.environ.get("DATABASE_URL", "postgresql://labelflow:labelflow@localhost:5432/labelflow")
    WOO_WEBHOOK_SECRET: str = os.environ.get("WOO_WEBHOOK_SECRET", "changeme")
    AGENT_TOKEN: str = os.environ.get("AGENT_TOKEN", "changeme-agent-token")
    SECRET_KEY: str = os.environ.get("SECRET_KEY", "changeme-secret-key")
    DEBUG: bool = os.environ.get("DEBUG", "false").lower() == "true"
    DIST_DIR: str = os.path.join(os.path.dirname(os.path.dirname(__file__)), "dist")


config = Config()
