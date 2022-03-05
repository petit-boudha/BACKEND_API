const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
require("dotenv").config();
const PORT = 8080;

const authRoutes = require("./routes/user.route");

mongoose
  .connect(process.env.MONGO_URI, {
    dbName: "jeere_db",
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("La connexion au Base de donnée est à succée");
  })
  .catch((err) => {
    console.error("Echec de la connexion à Mongo", err);
  });

const app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get("/", (req, res) => {
  return res.send({
    error: false,
    message: "Le Server fonctionne correctement",
  });
});

app.use("/users", authRoutes);

app.listen(PORT, () => {
  console.log("Le serveur écoute sur PORT: " + PORT);
});
