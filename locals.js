// import { createClient } from "@libsql/client";
const libsql = require("@libsql/client");
// const libsql = require("@tursodatabase/api");

try {
  const client = libsql.createClient({
    url: "http://127.0.0.1:8080",
  });

  const database = client.databases
    .create("new-database", {
      group: "default",
      is_schema: true,
    })
    .then((data) => console.log(data))
    .catch((err) => console.log(err));
} catch (err) {
  console.log(err);
}

// console.log(database);
