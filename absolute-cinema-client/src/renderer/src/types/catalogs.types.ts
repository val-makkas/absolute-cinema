export interface Manifest {
    id: string
    version: string
    description: string
    name: string
    resources: string[]
    types: string[]
    idPrefixes: string[]
    addonCatalogs: s_Catalog[]
    catalogs: e_Catalog[]
}

export interface s_Catalog {
    type: string
    id: string
    name: string
}

export interface e_Catalog extends s_Catalog {
    genres: string[]
    extra: string[]
    extraSupported: string []
}

export interface baseEntry {
    imdb_id: string
    moviedb_id: string
    imdbRating: number
    name: string
    type: string
    cast: string[]
    director: string[]
    description: string
    country: string
    genre: string[]
    poster: string
    background: string
    logo: string
    runtime: string
    trailerStreams: trailers[]
    awards: string
}

export interface movieEntry extends baseEntry {
    year: string
}

export interface seriesEntry extends baseEntry {
    releaseInfo: string
    videos: episode[]
}

export type entry = movieEntry | seriesEntry

export interface episode {
    id: string,
    name: string,
    season: number,
    number: number,
    firstAired: string,
    overview: string,
    thumbnail: string,
}

export interface trailers {
    title: string
    ytId: string
}
//resources -> types -> catalog_id -> genres