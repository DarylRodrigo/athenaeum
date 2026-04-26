from contextlib import asynccontextmanager

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from athenaeum_server.config import load_config
from athenaeum_server.api import inbox, thinking, sources, wiki, projects, spaces, nodes

load_dotenv()


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.config = load_config()
    yield


app = FastAPI(title="Athenaeum MVP", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
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


@app.get("/")
def root():
    return {"name": "Athenaeum MVP", "status": "ok"}
