import os, requests, httpx, asyncio
from fastapi import FastAPI, HTTPException

app = FastAPI()
TMDB_KEY = os.getenv("TMDB_API_KEY")  # set in your Docker/Env

TMDB_BASE = "https://api.themoviedb.org/3"

def tmdb_get(path, **params):
    params["api_key"] = TMDB_KEY
    r = requests.get(f"{TMDB_BASE}{path}", params=params)
    if not r.ok:
        raise HTTPException(status_code=r.status_code, detail=r.text)
    return r.json()

def get_tmdb_logo_url(tmdb_id):
    url = f"https://api.themoviedb.org/3/movie/{tmdb_id}/images?api_key={TMDB_KEY}&include_image_language=en,null"
    resp = requests.get(url)
    data = resp.json()
    if data.get("logos"):
        return "https://image.tmdb.org/t/p/original" + data["logos"][0]["file_path"]
    return ""

@app.get("/movies/popular")
async def popular_movies(page: int = 1):
    # 1) Fetch TMDb popular
    data = tmdb_get("/movie/popular", language="en-US", page=page)
    results = []
    # 2) For each, fetch external_ids to get the real imdb_id
    for m in data["results"]:
        tmdb_id = m["id"]
        ext = tmdb_get(f"/movie/{tmdb_id}/external_ids")
        imdb_id = ext.get("imdb_id")  # e.g. "tt1234567"
        results.append({
            "title":   m["title"],
            "imdb_id": imdb_id,
            "tmdb_id": tmdb_id,
            "poster":  f"https://image.tmdb.org/t/p/w500{m['poster_path']}"
        })
    return results

@app.get("/details/{imdb_id}/{tmdb_id}")
async def fetch_imdb_title_details(imdb_id: str, tmdb_id: str):
    import logging
    url = "https://graph.imdbapi.dev/v1"
    query = f'''
    {{
      title(id: "{imdb_id}") {{
        id
        type
        start_year
        plot
        genres
        primary_title
        original_title
        posters {{
          url
        }}
        rating {{
          aggregate_rating
          votes_count
        }}
      }}
    }}
    '''
    avatar = get_tmdb_logo_url(tmdb_id) if tmdb_id else ""
    payload = {"query": query}
    async with httpx.AsyncClient() as client:
        response = await client.post(url, json=payload)
        response.raise_for_status()
        resp_json = response.json()
        # Debug print
        print("IMDB API response:", resp_json)
        # Check for  in GraphQL response
        if "errors" in resp_json:
            raise Exception(f"GraphQL errors: {resp_json['errors']}")
        data = resp_json.get("data", {}).get("title", {})
        return {
            "id": data.get("id"),
            "title": data.get("primary_title") or data.get("original_title") or "N/A",
            "release_date": str(data.get("start_year")) if data.get("start_year") else "N/A",
            "poster": (data.get("posters") or [{}])[0].get("url", ""),
            "avatar": avatar,
            "overview": data.get("plot"),
            "rating": data.get("rating", {}).get("aggregate_rating"),
        }