import os

from dotenv import load_dotenv
from sqlmodel import Session, SQLModel, create_engine

from api import models  # noqa: F401  imported for side effect: registers tables on SQLModel.metadata

load_dotenv()

DATABASE_URL = os.environ["DATABASE_URL"]

engine = create_engine(DATABASE_URL)


def get_session():
    with Session(engine) as session:
        yield session


def create_all():
    SQLModel.metadata.create_all(engine)
