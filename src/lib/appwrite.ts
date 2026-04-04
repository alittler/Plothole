import { Client, Account, Databases } from "appwrite";

const client = new Client()
    .setEndpoint("https://tor.cloud.appwrite.io/v1")
    .setProject("69d0a116002c9c8a7320");

const account = new Account(client);
const databases = new Databases(client);

// Automatically ping the backend to verify setup
client.ping();

export { client, account, databases };
