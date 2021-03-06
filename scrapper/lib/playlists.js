const path = require("path");
const promisify = require("util").promisify;
const readdir = promisify(require("fs").readdir);
const readFile = promisify(require("fs").readFile);
const MongoClient = require("mongodb").MongoClient;

const FOLDER = path.join("playlists");

module.exports = {
  closeDB,
  connectToDB,
  deduplicatePlaylists,
  readAllPlaylists,
  writePlaylist
};

async function readAllPlaylists() {
  const datasets = await readdir(FOLDER);
  const playlists = [];

  for (let f of datasets) {
    const filePath = path.join(FOLDER, f);
    try {
      const data = await readFile(filePath);
      const playlistsFromFile = JSON.parse(data);
      Array.prototype.push.apply(playlists, playlistsFromFile);
    } catch (e) {
      console.error(`Fail to read ${filePath}`);
    }
  }

  return playlists;
}

function deduplicatePlaylists(playlists) {
  const dedupedPlaylists = {};
  const duplicatedPlaylists = {};
  playlists.forEach(pl => {
    if (dedupedPlaylists[pl.href]) {
      duplicatedPlaylists[pl.href] = pl;
    }
    dedupedPlaylists[pl.href] = pl;
  });
  return [Object.values(dedupedPlaylists), Object.values(duplicatedPlaylists)];
}

function getPlaylistsOwners(playlists) {
  return Object.keys(
    playlists.reduce((memo, pl) => {
      memo[pl.owner] = true;
      return memo;
    }, {})
  );
}

// MONGODB CONFIG -- START
const url = "mongodb://localhost:27017";
const dbName = "playlistFinder";
const collectionName = "playlists";
// MONGODB CONFIG -- END

let client;
async function connectToDB() {
  try {
    client = await MongoClient.connect(
      url,
      { useNewUrlParser: true }
    );
    return client.db(dbName);
  } catch (e) {
    console.error(`Failed to connect to ${url}, ${dbName}`);
    throw e;
  }
}

async function closeDB(db) {
  if (client) client.close();
}

async function writePlaylist(db, playlist) {
  const collection = await db.collection(collectionName);
  try {
    await collection.insertOne(playlist);
  } catch(e) {
    console.error(`Failed to insert ${playlist.id}`);
  }
}
