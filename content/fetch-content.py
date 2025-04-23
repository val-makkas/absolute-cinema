from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from imdb import Cinemagoer

app = FastAPI()
ia = Cinemagoer()

class Movie(BaseModel):
    imdb_id: str

@app.get("/movies/popular")
async def popular_movies():
    results = ia.get_popular100_movies()
    # results is a list of dicts from TMDb; adapt as needed
    return [{"title": m["title"], "imdb_id": m["imdb_id"], "poster": m["poster_path"]} for m in results]

@app.get("/movie/{imdb_id}")
async def movie_details(imdb_id: str):
    try:
        movie = ia.get_movie(imdb_id)
        return {
            "title": movie.get("title"),
            "year": movie.get("year"),
            "plot": movie.get("plot outline"),
            "genres": movie.get("genres"),
            "poster": movie.get("cover url"),
        }
    except Exception:
        raise HTTPException(status_code=404, detail="Movie not found")
