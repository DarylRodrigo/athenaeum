import os
from pathlib import Path

import yaml
from pydantic import BaseModel


class SpaceConfig(BaseModel):
    id: str
    label: str
    accent: str


class ServerConfig(BaseModel):
    capture_port: int = 7878
    push_debounce_seconds: int = 300


class PathsConfig(BaseModel):
    knowledge_db: str = "knowledge-db/"
    inbox: str = "knowledge-db/inbox/"
    thinking: str = "knowledge-db/thinking/"
    sources: str = "knowledge-db/sources/"
    wiki: str = "knowledge-db/wiki/"
    projects: str = "knowledge-db/projects/"
    meta: str = "knowledge-db/meta/"
    dashboard: str = "dashboard/"


class LLMConfig(BaseModel):
    bot_name: str = "Athenaeum Bot"
    bot_email: str = "bot@athenaeum.local"
    edge_kinds: list[str] = [
        "supports", "contradicts", "extends", "questions",
        "instance_of", "supported_by", "relates_to",
    ]


class Config(BaseModel):
    spaces: list[SpaceConfig] = []
    reading_spaces: list[str] = []
    server: ServerConfig = ServerConfig()
    paths: PathsConfig = PathsConfig()
    llm: LLMConfig = LLMConfig()
    repo_path: Path = Path(".")

    def resolve_path(self, relative: str) -> Path:
        return self.repo_path / relative


def load_config() -> Config:
    repo_path = Path(os.environ.get("ATHENAEUM_REPO_PATH", Path.cwd()))

    config_file = repo_path / "athenaeum.config.yaml"
    if config_file.exists():
        with open(config_file) as f:
            raw = yaml.safe_load(f) or {}
    else:
        raw = {}

    config = Config(**raw, repo_path=repo_path)
    return config
