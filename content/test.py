import requests

TMDB_API_KEY = "7c34cffcb5db700d0577403906af2f7c"  # <-- Replace with your real TMDb API key

def get_tmdb_id_from_imdb(imdb_id):
    url = f"https://api.themoviedb.org/3/find/{imdb_id}?api_key={TMDB_API_KEY}&external_source=imdb_id"
    resp = requests.get(url)
    print("TMDb Find Response:", resp.status_code, resp.text)
    data = resp.json()
    if data.get("movie_results"):
        return data["movie_results"][0]["id"]
    elif data.get("tv_results"):
        return data["tv_results"][0]["id"]
    return None

def get_tmdb_logo_url(tmdb_id):
    url = f"https://api.themoviedb.org/3/movie/{tmdb_id}/images?api_key={TMDB_API_KEY}&include_image_language=en,null"
    resp = requests.get(url)
    print("TMDb Images Response:", resp.status_code, resp.text)
    data = resp.json()
    if data.get("logos"):
        return "https://image.tmdb.org/t/p/original" + data["logos"][0]["file_path"]
    return ""

if __name__ == "__main__":
    imdb_id = "tt13622970"  # Example: Moana 2
    tmdb_id = get_tmdb_id_from_imdb(imdb_id)
    print("TMDb ID:", tmdb_id)
    if tmdb_id:
        logo_url = get_tmdb_logo_url(tmdb_id)
        print("Logo URL:", logo_url)
    else:
        print("No TMDb ID found for IMDb ID:", imdb_id)