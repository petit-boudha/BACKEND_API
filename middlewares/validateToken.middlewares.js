const jwt = require("jsonwebtoken");
require("dotenv").config();

const User = require("../models/user.model");

async function validateToken(req, res, next) {
  const authorizationHeader = req.headers.authorization;
  let result;
  if (!authorizationHeader)
    return res.status(401).json({
      error: true,
      message: "Le token d'accès est absent",
    });

  const token = req.headers.authorization.split(" ")[1]; 
  const options = {
    expiresIn: "24h",
  };
  try {
    let user = await User.findOne({
      accessToken: token,
    });
    
    if (!user) {
      result = {
        error: true,
        message: `Erreur d'autorisation`,
      };
      return res.status(403).json(result);
    }

    result = jwt.verify(token, process.env.JWT_SECRET, options);

    if (!user.userId === result.id) {
      result = {
        error: true,
        message: `Le token est Invalide`,
      };

      return res.status(401).json(result);
    }

    result["CodeDeParrainage"] = user.CodeDeParrainage;

    req.decoded = result;
    next();
  } catch (err) {
   
    if (err.name === "TokenExpiredError") {
      result = {
        error: true,
        message: `Le token est expiré`,
      };
    } else {
      result = {
        error: true,
        message: `Erreur d'authentification`,
      };
    }
    return res.status(403).json(result);
  }
}

module.exports = { validateToken };
