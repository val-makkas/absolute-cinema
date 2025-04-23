import fetch from "node-fetch";

export async function loadAddon(manifestUrl) {
    const res = await fetch(manifestUrl);
    if (!res.ok) throw new Error("Failed to fetch manifest");

    const manifest = await res.json();
    return {
        manifest,
        baseUrl: manifestUrl.replace(/\/manifest\.json$/, ""),
    };
}

export async function fetchStreamsFromAddon(baseUrl, type, imdbId) {
    const url = `${baseUrl}/stream/${type}/${imdbId}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("Failed to fetch streams");

    const { streams } = await res.json();
    return streams;
}
