import logging
from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from athenaeum_server.config import load_config
from athenaeum_server.api import inbox, thinking, sources, wiki, projects, spaces, nodes, graph, status, search

load_dotenv()
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    config = load_config()
    app.state.config = config

    # Rebuild graph index on startup
    from athenaeum_server.lib.graph import rebuild, write_index
    graph_data = rebuild(config)
    write_index(config, graph_data)
    logging.info("Graph index rebuilt on startup: %d nodes", len(graph_data["nodes"]))

    # Set up push debouncer
    from athenaeum_server.lib.push_debouncer import PushDebouncer
    app.state.push_debouncer = PushDebouncer(
        repo_path=config.repo_path,
        delay_seconds=config.server.push_debounce_seconds,
    )

    yield

    # Flush any pending push on shutdown
    app.state.push_debouncer.flush()


app = FastAPI(title="Athenaeum MVP", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "https://kb.rodbachler.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(inbox.router)
app.include_router(thinking.router)
app.include_router(sources.router)
app.include_router(wiki.router)
app.include_router(projects.router)
app.include_router(spaces.router)
app.include_router(nodes.router)
app.include_router(graph.router)
app.include_router(status.router)
app.include_router(search.router)


@app.get("/")
def root():
    return {"name": "Athenaeum MVP", "status": "ok"}
