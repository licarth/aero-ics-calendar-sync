import express from "express";
import { flights } from ".";
const app = express();
const port = 3000;

app.get("/*", flights);

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});
