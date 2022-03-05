const sanitize = require("mongo-sanitize");
module.exports = (req, res, next) => {
  try {
    req.body = sanitize(req.body);
    next();
  } catch (error) {
    console.log("Erreur nettoyage du corps de la requete", error);
    return res.status(500).json({
      error: true,
      message: "Impossible de désinfecter le corps de la requete",
    });
  }
};
